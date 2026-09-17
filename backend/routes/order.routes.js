// Order routes - place, view, update orders
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const Shop = require('../models/Shop');
const { notifyOwner } = require('../services/notification.service');
const { sendOrderConfirmation, sendStatusUpdate } = require('../services/whatsapp.service');
const { sendOrderPlacedSMS, sendStatusUpdateSMS, isSmsEnabled } = require('../services/sms.service');
const Coupon = require('../models/Coupon');

// ── Validation for order creation ────────────────────────────────
const orderValidation = [
  body('shopId').notEmpty().withMessage('Shop ID required'),
  body('customerName').trim().notEmpty().withMessage('Your name is required'),
  body('customerPhone').trim().notEmpty().withMessage('Phone number is required'),
  body('items').isArray({ min: 1 }).withMessage('Cart is empty'),
  body('paymentMethod')
    .isIn(['cod', 'card_on_delivery', 'pickup', 'bank_transfer', 'online'])
    .withMessage('Invalid payment method'),
];

// POST /api/orders/create - Place a new order (no login needed)
router.post('/create', orderValidation, async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }

  try {
    const {
      shopId, customerName, customerPhone, customerAddress,
      customerLocation, items, paymentMethod, notes, channel,
      couponId, discount: couponDiscount, pointsRedeemed
    } = req.body;

    // Load shop to calculate delivery charge
    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });
    if (!shop.isActive) return res.status(400).json({ success: false, message: 'This shop is currently unavailable.' });

    // Check minimum order amount
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.qty)), 0);
    if (shop.minOrderAmount > 0 && subtotal < shop.minOrderAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is ₹${shop.minOrderAmount}. Add ₹${shop.minOrderAmount - subtotal} more.`
      });
    }

    // Calculate delivery charge
    const deliveryCharge = (paymentMethod === 'pickup' || subtotal >= shop.freeDeliveryAbove)
      ? 0
      : shop.deliveryCharge;

    const discount = Number(couponDiscount) || 0;
    const total = subtotal + deliveryCharge - discount;

    // Build items array with totals
    const orderItems = items.map(item => ({
      productId: item.productId,
      name: item.name,
      price: Number(item.price),
      qty: Number(item.qty),
      total: Number(item.price) * Number(item.qty),
      image: item.image || ''
    }));

    // Create the order
    const order = await Order.create({
      shopId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress?.trim() || '',
      customerLocation: customerLocation || {},
      items: orderItems,
      subtotal,
      deliveryCharge,
      discount,
      total,
      paymentMethod,
      orderStatus: 'new',
      channel: channel || 'website',
      notes: notes?.trim() || ''
    });

    // Save or update customer record
    try {
      await Customer.findOneAndUpdate(
        { shopId, phone: customerPhone.trim() },
        {
          $set: {
            name: customerName.trim(),
            address: customerAddress || '',
            lastOrderAt: new Date()
          },
          $inc: { totalOrders: 1, totalSpent: total }
        },
        { upsert: true, new: true }
      );
    } catch (e) { /* non-critical */ }

    // Update shop's total stats
    await Shop.findByIdAndUpdate(shopId, {
      $inc: { totalOrders: 1, totalRevenue: total }
    });

    // Increment coupon usage
    if (couponId) {
      await Coupon.findByIdAndUpdate(couponId, { $inc: { usedCount: 1 } }).catch(() => {});
    }

    // Deduct redeemed loyalty points
    if (pointsRedeemed && pointsRedeemed > 0) {
      await Customer.findOneAndUpdate(
        { shopId, phone: customerPhone.trim() },
        { $inc: { loyaltyPoints: -Math.abs(pointsRedeemed) } }
      ).catch(() => {});
    }

    // Save notification for shop owner
    await Notification.create({
      shopId,
      orderId: order._id,
      type: 'new_order',
      title: `New Order #${order.orderId}`,
      message: `${customerName} placed an order for ₹${total}`
    });

    // Send push notification to owner's phone (works even if app is closed)
    notifyOwner(shop, order).catch(() => {});

    // Send WhatsApp confirmation to customer
    if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'your_meta_access_token') {
      sendOrderConfirmation(order.customerPhone, order, shop.name).catch(() => {});
    }

    // Send SMS confirmation to customer
    if (isSmsEnabled()) {
      sendOrderPlacedSMS(order.customerPhone, order, shop.name).catch(() => {});
    }

    // Emit real-time socket event to shop dashboard
    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${shopId}`).emit('new_order', {
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerAddress: order.customerAddress,
        customerLocation: order.customerLocation,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        total: order.total,
        paymentMethod: order.paymentMethod,
        orderStatus: 'new',
        channel: order.channel,
        notes: order.notes,
        createdAt: order.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      order: {
        _id: order._id,
        orderId: order.orderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharge: order.deliveryCharge,
        total: order.total,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        createdAt: order.createdAt,
        shopName: shop.name,
        shopPhone: shop.whatsappNumber || shop.phone
      }
    });

  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ success: false, message: 'Could not place order. Please try again.' });
  }
});

// GET /api/orders/track/:id - Public order tracking (no login needed)
router.get('/track/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('riderId', 'name phone vehicleType')
      .select('-customerLocation');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders - Owner: get all orders
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    let query = { shopId: req.shop._id };
    if (status) query.orderStatus = status;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('riderId', 'name phone');

    const total = await Order.countDocuments(query);
    res.json({ success: true, orders, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/orders/:id - Single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, shopId: req.shop._id })
      .populate('riderId', 'name phone vehicleType');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { orderStatus, riderId } = req.body;
    const update = { orderStatus };
    if (riderId) update.riderId = riderId;

    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      update,
      { new: true }
    );

    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Real-time update to customer tracking page
    const io = req.app.get('io');
    if (io) {
      io.to(`order_${order._id}`).emit('order_status_update', {
        orderId: order._id,
        orderStatus
      });
    }

    // Award loyalty points when delivered
    if (orderStatus === 'delivered') {
      const shop = await Shop.findById(req.shop._id).select('name loyaltySettings');
      const settings = shop?.loyaltySettings;
      if (settings?.enabled !== false) {
        const rate = settings?.pointsPerRupee || 1;
        const pointsEarned = Math.floor(order.total * rate);
        if (pointsEarned > 0) {
          await Customer.findOneAndUpdate(
            { shopId: req.shop._id, phone: order.customerPhone },
            { $inc: { loyaltyPoints: pointsEarned } }
          ).catch(() => {});
        }
      }

      // Send WhatsApp + SMS status update
      if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'your_meta_access_token') {
        sendStatusUpdate(order.customerPhone, order.orderId, orderStatus, shop?.name || 'the shop').catch(() => {});
      }
      if (isSmsEnabled()) {
        sendStatusUpdateSMS(order.customerPhone, order, orderStatus, shop?.name || 'the shop').catch(() => {});
      }
    } else {
      const shop = await Shop.findById(req.shop._id).select('name');
      if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'your_meta_access_token') {
        sendStatusUpdate(order.customerPhone, order.orderId, orderStatus, shop?.name || 'the shop').catch(() => {});
      }
      if (isSmsEnabled()) {
        sendStatusUpdateSMS(order.customerPhone, order, orderStatus, shop?.name || 'the shop').catch(() => {});
      }
    }

    res.json({ success: true, message: 'Status updated!', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
