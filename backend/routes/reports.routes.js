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

// GET /api/reports/gst.csv - GSTR-1 style GST sales report
router.get('/gst.csv', protect, async (req, res) => {
  try {
    const { from, to } = req.query;
    const { start, end } = dateRange(from, to);
    const shopId = req.shop._id;

    const orders = await Order.find({
      shopId,
      createdAt: { $gte: start, $lte: end },
      orderStatus: { $ne: 'cancelled' }
    }).sort({ createdAt: 1 });

    // Build per-invoice rows (B2C supply summary for GSTR-1)
    const invoiceRows = orders.map(o => {
      const taxable = o.subtotal || 0;
      const gstAmt = o.items.reduce((sum, i) => {
        const rate = i.gstRate || 0;
        return sum + ((i.total || 0) * rate / (100 + rate));
      }, 0);
      const cgst = gstAmt / 2;
      const sgst = gstAmt / 2;
      return {
        date: fmtDate(o.createdAt),
        orderId: o.orderId,
        customer: o.customerName,
        phone: o.customerPhone,
        taxableValue: taxable.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        igst: (0).toFixed(2),
        totalGST: gstAmt.toFixed(2),
        total: (o.total || 0).toFixed(2),
        paymentMethod: o.paymentMethod,
      };
    });

    // HSN-wise summary
    const hsnMap = {};
    orders.forEach(o => {
      o.items.forEach(item => {
        const hsn = item.hsnCode || 'UNCLASSIFIED';
        const rate = item.gstRate || 0;
        const key = `${hsn}_${rate}`;
        const taxable = (item.total || 0) * 100 / (100 + rate);
        const gstAmt = (item.total || 0) * rate / (100 + rate);
        if (!hsnMap[key]) hsnMap[key] = { hsn, rate, description: item.name, taxable: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
        hsnMap[key].taxable += taxable;
        hsnMap[key].cgst += gstAmt / 2;
        hsnMap[key].sgst += gstAmt / 2;
        hsnMap[key].total += item.total || 0;
      });
    });
    const hsnRows = Object.values(hsnMap).map(h => ({
      hsn: h.hsn,
      description: h.description,
      rate: `${h.rate}%`,
      taxableValue: h.taxable.toFixed(2),
      cgst: h.cgst.toFixed(2),
      sgst: h.sgst.toFixed(2),
      igst: h.igst.toFixed(2),
      totalGST: (h.cgst + h.sgst).toFixed(2),
      grossTotal: h.total.toFixed(2),
    }));

    // Totals
    const totals = invoiceRows.reduce((acc, r) => {
      acc.taxable += parseFloat(r.taxableValue);
      acc.cgst += parseFloat(r.cgst);
      acc.sgst += parseFloat(r.sgst);
      acc.gst += parseFloat(r.totalGST);
      acc.total += parseFloat(r.total);
      return acc;
    }, { taxable: 0, cgst: 0, sgst: 0, gst: 0, total: 0 });

    // Build CSV with two sections
    const invoiceCols = [
      { label: 'Date', key: 'date' }, { label: 'Order No', key: 'orderId' },
      { label: 'Customer', key: 'customer' }, { label: 'Phone', key: 'phone' },
      { label: 'Taxable Value (₹)', key: 'taxableValue' },
      { label: 'CGST (₹)', key: 'cgst' }, { label: 'SGST (₹)', key: 'sgst' },
      { label: 'IGST (₹)', key: 'igst' }, { label: 'Total GST (₹)', key: 'totalGST' },
      { label: 'Invoice Total (₹)', key: 'total' }, { label: 'Payment', key: 'paymentMethod' },
    ];
    const hsnCols = [
      { label: 'HSN Code', key: 'hsn' }, { label: 'Description', key: 'description' },
      { label: 'GST Rate', key: 'rate' },
      { label: 'Taxable Value (₹)', key: 'taxableValue' },
      { label: 'CGST (₹)', key: 'cgst' }, { label: 'SGST (₹)', key: 'sgst' },
      { label: 'IGST (₹)', key: 'igst' }, { label: 'Total GST (₹)', key: 'totalGST' },
      { label: 'Gross Total (₹)', key: 'grossTotal' },
    ];

    const csvParts = [
      `"GST SALES REPORT (GSTR-1 Style)"`,
      `"Period: ${fmtDate(start)} to ${fmtDate(end)}"`,
      `"Generated: ${fmtDate(new Date())}"`,
      ``,
      `"=== SECTION 1: INVOICE-WISE DETAILS (B2C) ==="`,
      toCSV(invoiceRows, invoiceCols),
      ``,
      `"=== SECTION 2: HSN-WISE SUMMARY ==="`,
      toCSV(hsnRows, hsnCols),
      ``,
      `"=== TOTALS ==="`,
      `"Total Orders","${orders.length}"`,
      `"Total Taxable Value (₹)","${totals.taxable.toFixed(2)}"`,
      `"Total CGST (₹)","${totals.cgst.toFixed(2)}"`,
      `"Total SGST (₹)","${totals.sgst.toFixed(2)}"`,
      `"Total GST Collected (₹)","${totals.gst.toFixed(2)}"`,
      `"Gross Sales (₹)","${totals.total.toFixed(2)}"`,
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="GST-Report-${from || 'all'}-to-${to || 'today'}.csv"`);
    res.send(csvParts.join('\r\n'));
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
