// Analytics routes - sales reports, charts for dashboard
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const moment = require('moment');

// GET /api/analytics/summary - Today's quick stats for dashboard
router.get('/summary', protect, async (req, res) => {
  try {
    const shopId = req.shop._id;
    const today = moment().startOf('day').toDate();
    const thisMonth = moment().startOf('month').toDate();

    // Count today's orders
    const todayOrders = await Order.countDocuments({ shopId, createdAt: { $gte: today } });

    // Today's revenue
    const todayRevenue = await Order.aggregate([
      { $match: { shopId, createdAt: { $gte: today }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // This month's revenue
    const monthRevenue = await Order.aggregate([
      { $match: { shopId, createdAt: { $gte: thisMonth }, orderStatus: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    // Total customers
    const totalCustomers = await Customer.countDocuments({ shopId });

    // Pending orders count
    const pendingOrders = await Order.countDocuments({ shopId, orderStatus: { $in: ['new', 'confirmed', 'packing'] } });

    res.json({
      success: true,
      data: {
        todayOrders,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthRevenue: monthRevenue[0]?.total || 0,
        totalCustomers,
        pendingOrders
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/sales-chart - Last 7 days sales data for chart
router.get('/sales-chart', protect, async (req, res) => {
  try {
    const shopId = req.shop._id;
    const days = 7;
    const startDate = moment().subtract(days - 1, 'days').startOf('day').toDate();

    const salesData = await Order.aggregate([
      { $match: { shopId, createdAt: { $gte: startDate }, orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({ success: true, data: salesData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/analytics/top-products - Best selling products
router.get('/top-products', protect, async (req, res) => {
  try {
    const shopId = req.shop._id;

    const topProducts = await Order.aggregate([
      { $match: { shopId, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          totalSold: { $sum: '$items.qty' },
          revenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    res.json({ success: true, data: topProducts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
