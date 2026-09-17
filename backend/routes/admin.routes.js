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

    // Plan breakdown
    const planBreakdown = await Shop.aggregate([
      { $group: { _id: '$plan', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        totalShops,
        activeShops,
        suspendedShops: totalShops - activeShops,
        totalOrders,
        totalCustomers,
        totalRevenue: revenueData[0]?.total || 0,
        last7Days,
        planBreakdown
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

// PUT /api/admin/shops/:id/suspend - Suspend or activate a shop
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
    const { plan } = req.body;
    const shop = await Shop.findByIdAndUpdate(req.params.id, { plan }, { new: true });
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    res.json({ success: true, message: `Plan updated to ${plan}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/shops/:id - Single shop details
router.get('/shops/:id', guard, async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).select('-password');
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    const [orderCount, customerCount, revenueData] = await Promise.all([
      Order.countDocuments({ shopId: shop._id }),
      Customer.countDocuments({ shopId: shop._id }),
      Order.aggregate([
        { $match: { shopId: shop._id, orderStatus: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);
    res.json({ success: true, shop, orderCount, customerCount, revenue: revenueData[0]?.total || 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
