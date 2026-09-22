// Invoice routes - generate and fetch GST invoices
const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { protect } = require('../middleware/auth.middleware');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Shop = require('../models/Shop');
const { generateInvoicePDF } = require('../services/invoice.service');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload PDF buffer to Cloudinary
async function uploadPDF(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', public_id: publicId, format: 'pdf', folder: 'souqly-invoices' },
      (err, result) => { if (err) reject(err); else resolve(result.secure_url); }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

// GET /api/invoices - List all invoices for this shop
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const invoices = await Invoice.find({ shopId: req.shop._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('orderId', 'orderId orderStatus');

    const total = await Invoice.countDocuments({ shopId: req.shop._id });
    res.json({ success: true, invoices, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/invoices/generate/:orderId - Generate invoice for an order
router.post('/generate/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, shopId: req.shop._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const shop = await Shop.findById(req.shop._id);

    // Return existing invoice if already generated
    const existing = await Invoice.findOne({ orderId: order._id });
    if (existing) {
      return res.json({ success: true, invoice: existing, message: 'Invoice already exists.' });
    }

    // Generate invoice number: INV-SHOPCODE-ORDERID
    const shopCode = shop.slug?.toUpperCase().slice(0, 4) || 'SHOP';
    const invoiceNumber = `INV-${shopCode}-${order.orderId}`;

    // Build PDF
    const pdfBuffer = await generateInvoicePDF(order, shop);

    // Upload to Cloudinary
    const pdfUrl = await uploadPDF(pdfBuffer, `${invoiceNumber}-${Date.now()}`);

    // Save invoice record
    const invoice = await Invoice.create({
      shopId: shop._id,
      orderId: order._id,
      invoiceNumber,
      sellerName: shop.name,
      sellerGST: shop.gstNumber || '',
      sellerAddress: `${shop.address || ''}, ${shop.city || ''}, ${shop.state || ''}`.trim().replace(/^,|,$/g, ''),
      buyerName: order.customerName,
      buyerPhone: order.customerPhone,
      buyerAddress: order.customerAddress || '',
      items: order.items.map(i => ({
        name: i.name,
        qty: i.qty,
        price: i.price,
        hsnCode: '',
        gstRate: 0,
        gstAmount: 0,
        total: i.total,
      })),
      subtotal: order.subtotal,
      totalGST: 0,
      deliveryCharge: order.deliveryCharge,
      discount: order.discount || 0,
      grandTotal: order.total,
      pdfUrl,
    });

    // Save PDF URL back to order
    await Order.findByIdAndUpdate(order._id, { invoiceUrl: pdfUrl });

    res.json({ success: true, invoice, message: 'Invoice generated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/order/:orderId - Get invoice for a specific order
router.get('/order/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, shopId: req.shop._id });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    const invoice = await Invoice.findOne({ orderId: order._id });
    if (!invoice) return res.status(404).json({ success: false, message: 'No invoice yet. Generate one first.' });

    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/invoices/download/:invoiceId - Stream PDF directly
router.get('/download/:invoiceId', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.invoiceId, shopId: req.shop._id });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    // Redirect to Cloudinary PDF
    res.redirect(invoice.pdfUrl);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public route - customer can view their own invoice by invoice number
router.get('/public/:invoiceNumber', async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ invoiceNumber: req.params.invoiceNumber })
      .populate('shopId', 'name address city gstNumber logo');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found.' });
    res.json({ success: true, invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
