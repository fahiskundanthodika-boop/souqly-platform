// Admin routes - Souqly platform owner only (FaizeCart)
const express = require('express');
const router = express.Router();
const { protect, superAdmin } = require('../middleware/auth.middleware');
const Shop = require('../models/Shop');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

const guard = [protect, superAdmin];

// GET /api/admin/stats - Platform overview numbers
router.get('/stats', guard, async (req, res) => {
  try {
    const [totalShops, activeShops, totalOrders, totalCustomers, revenueData] = await Promise.all([
      Shop.countDocuments(),
      Shop.countDocuments({ isActive: true }),
      Order.countDocuments(),
      Customer.countDocuments(),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    // Orders last 7 days
    const last7Days = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Orders last 30 days (for chart)
    const last30Days = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Plan breakdown
    const planBreakdown = await Shop.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    // Top shops by revenue
    const topShops = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: '$shopId', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'shops', localField: '_id', foreignField: '_id', as: 'shop' } },
      { $unwind: '$shop' },
      { $project: { name: '$shop.name', city: '$shop.city', plan: '$shop.plan', revenue: 1, orders: 1 } }
    ]);

    // New shops this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);
    const newShopsThisMonth = await Shop.countDocuments({ createdAt: { $gte: startOfMonth } });

    res.json({
      success: true,
      stats: {
        totalShops,
        activeShops,
        suspendedShops: totalShops - activeShops,
        totalOrders,
        totalCustomers,
        totalRevenue: revenueData[0]?.total || 0,
        newShopsThisMonth,
        last7Days,
        last30Days,
        planBreakdown,
        topShops
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/shops - All shops with full details
router.get('/shops', guard, async (req, res) => {
  try {
    const { search, plan, status, page = 1, limit = 20 } = req.query;
    let query = {};
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { ownerName: { $regex: search, $options: 'i' } }
    ];
    if (plan) query.plan = plan;
    if (status === 'active') query.isActive = true;
    if (status === 'suspended') query.isActive = false;

    const shops = await Shop.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .select('-password');

    const total = await Shop.countDocuments(query);
    res.json({ success: true, shops, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/shops/:id - Single shop details
router.get('/shops/:id', guard, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select('-password');
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    const [orderCount, customerCount, revenueData, recentOrders] = await Promise.all([
      Order.countDocuments({ shopId: shop._id }),
      Customer.countDocuments({ shopId: shop._id }),
      Order.aggregate([
        { $match: { shopId: shop._id, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Order.find({ shopId: shop._id }).sort({ createdAt: -1 }).limit(5).select('orderId customerName total orderStatus createdAt')
    ]);
    res.json({
      success: true,
      shop,
      orderCount,
      customerCount,
      revenue: revenueData[0]?.total || 0,
      recentOrders
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/shops/:id/suspend - Toggle suspend/activate
router.put('/shops/:id/suspend', guard, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    shop.isActive = !shop.isActive;
    await shop.save();
    res.json({ success: true, isActive: shop.isActive, message: shop.isActive ? 'Shop activated.' : 'Shop suspended.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/shops/:id/plan - Change shop plan
router.put('/shops/:id/plan', guard, async (req, res) => {
  try {
    const { plan, planExpiry } = req.body;
    const update = { plan };
    if (planExpiry) update.planExpiry = new Date(planExpiry);
    const shop = await Shop.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    res.json({ success: true, message: `Plan updated to ${plan}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/admin/shops/:id - Permanently delete a shop
router.delete('/shops/:id', guard, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    // Delete all related data
    await Promise.all([
      Order.deleteMany({ shopId: shop._id }),
      Customer.deleteMany({ shopId: shop._id }),
      Shop.findByIdAndDelete(shop._id)
    ]);
    res.json({ success: true, message: `${shop.name} and all its data deleted.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/admin/shops/:id/impersonate - Generate a login token for a shop (for support)
router.post('/shops/:id/impersonate', guard, async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const shop = await Shop.findById(req.params.id).select('-password');
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    const token = jwt.sign({ id: shop._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ success: true, token, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
