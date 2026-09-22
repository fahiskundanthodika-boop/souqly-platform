// Reports & Export routes - CSV/Excel downloads for shop owners
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Order = require('../models/Order');
const Customer = require('../models/Customer');

// Convert array of objects to CSV string
function toCSV(rows, columns) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const lines = rows.map(row =>
    columns.map(c => {
      const val = c.fn ? c.fn(row) : (row[c.key] ?? '');
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [header, ...lines].join('\r\n');
}

function dateRange(from, to) {
  const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// GET /api/reports/orders.csv
router.get('/orders.csv', protect, async (req, res) => {
  try {
    const { from, to, status } = req.query;
    const { start, end } = dateRange(from, to);
    const query = { shopId: req.shop._id, createdAt: { $gte: start, $lte: end } };
    if (status) query.orderStatus = status;

    const orders = await Order.find(query).sort({ createdAt: -1 }).populate('riderId', 'name');

    const columns = [
      { label: 'Order No',       key: 'orderId' },
      { label: 'Date',           fn: r => fmtDate(r.createdAt) },
      { label: 'Customer Name',  key: 'customerName' },
      { label: 'Phone',          key: 'customerPhone' },
      { label: 'Address',        key: 'customerAddress' },
      { label: 'Items',          fn: r => r.items.map(i => `${i.name} x${i.qty}`).join('; ') },
      { label: 'Subtotal',       key: 'subtotal' },
      { label: 'Delivery',       key: 'deliveryCharge' },
      { label: 'Discount',       key: 'discount' },
      { label: 'Total',          key: 'total' },
      { label: 'Payment',        key: 'paymentMethod' },
      { label: 'Status',         key: 'orderStatus' },
      { label: 'Rider',          fn: r => r.riderId?.name || '' },
      { label: 'Channel',        key: 'channel' },
      { label: 'Notes',          key: 'notes' },
    ];

    const csv = toCSV(orders, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${from || 'all'}-to-${to || 'today'}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/customers.csv
router.get('/customers.csv', protect, async (req, res) => {
  try {
    const customers = await Customer.find({ shopId: req.shop._id }).sort({ totalSpent: -1 });

    const columns = [
      { label: 'Name',           key: 'name' },
      { label: 'Phone',          key: 'phone' },
      { label: 'Email',          key: 'email' },
      { label: 'Address',        key: 'address' },
      { label: 'Total Orders',   key: 'totalOrders' },
      { label: 'Total Spent',    key: 'totalSpent' },
      { label: 'Loyalty Points', key: 'loyaltyPoints' },
      { label: 'Last Order',     fn: r => fmtDate(r.lastOrderAt) },
      { label: 'Joined',         fn: r => fmtDate(r.createdAt) },
    ];

    const csv = toCSV(customers, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/revenue.csv - Daily revenue summary
router.get('/revenue.csv', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const rows = await Order.aggregate([
      { $match: { shopId: req.shop._id, createdAt: { $gte: start, $lte: end }, orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          orders: { $sum: 1 },
          subtotal: { $sum: '$subtotal' },
          deliveryRevenue: { $sum: '$deliveryCharge' },
          discounts: { $sum: '$discount' },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const columns = [
      { label: 'Date',             key: '_id' },
      { label: 'Orders',           key: 'orders' },
      { label: 'Subtotal (INR)',   fn: r => r.subtotal.toFixed(2) },
      { label: 'Delivery (INR)',   fn: r => r.deliveryRevenue.toFixed(2) },
      { label: 'Discounts (INR)',  fn: r => r.discounts.toFixed(2) },
      { label: 'Net Revenue (INR)', fn: r => r.revenue.toFixed(2) },
    ];

    const csv = toCSV(rows, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-${from || 'all'}-to-${to || 'today'}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/products.csv - Product sales summary
router.get('/products.csv', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);

    const rows = await Order.aggregate([
      { $match: { shopId: req.shop._id, createdAt: { $gte: start, $lte: end }, orderStatus: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productId',
          name: { $first: '$items.name' },
          unitsSold: { $sum: '$items.qty' },
          revenue: { $sum: '$items.total' },
          avgPrice: { $avg: '$items.price' }
        }
      },
      { $sort: { unitsSold: -1 } }
    ]);

    const columns = [
      { label: 'Product',         key: 'name' },
      { label: 'Units Sold',      key: 'unitsSold' },
      { label: 'Revenue (INR)',   fn: r => r.revenue.toFixed(2) },
      { label: 'Avg Price (INR)', fn: r => r.avgPrice.toFixed(2) },
    ];

    const csv = toCSV(rows, columns);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-${from || 'all'}-to-${to || 'today'}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/summary - JSON summary for the reports page
router.get('/summary', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);
    const shopId = req.shop._id;
    const matchRange = { shopId, createdAt: { $gte: start, $lte: end } };
    const matchRevenue = { ...matchRange, orderStatus: { $ne: 'cancelled' } };

    const [
      totalOrders,
      cancelledOrders,
      revenueAgg,
      avgOrderAgg,
      newCustomers,
      dailyChart,
      topProducts,
      statusBreakdown,
      paymentBreakdown
    ] = await Promise.all([
      Order.countDocuments(matchRange),
      Order.countDocuments({ ...matchRange, orderStatus: 'cancelled' }),
      Order.aggregate([{ $match: matchRevenue }, { $group: { _id: null, total: { $sum: '$total' }, delivery: { $sum: '$deliveryCharge' }, discount: { $sum: '$discount' } } }]),
      Order.aggregate([{ $match: matchRevenue }, { $group: { _id: null, avg: { $avg: '$total' } } }]),
      Customer.countDocuments({ shopId, createdAt: { $gte: start, $lte: end } }),
      Order.aggregate([
        { $match: matchRevenue },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Order.aggregate([
        { $match: matchRevenue },
        { $unwind: '$items' },
        { $group: { _id: '$items.name', units: { $sum: '$items.qty' }, revenue: { $sum: '$items.total' } } },
        { $sort: { units: -1 } },
        { $limit: 5 }
      ]),
      Order.aggregate([{ $match: matchRange }, { $group: { _id: '$orderStatus', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: matchRevenue }, { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } }])
    ]);

    res.json({
      success: true,
      data: {
        totalOrders,
        cancelledOrders,
        revenue: revenueAgg[0]?.total || 0,
        deliveryRevenue: revenueAgg[0]?.delivery || 0,
        totalDiscount: revenueAgg[0]?.discount || 0,
        avgOrderValue: Math.round(avgOrderAgg[0]?.avg || 0),
        newCustomers,
        dailyChart,
        topProducts,
        statusBreakdown,
        paymentBreakdown
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
