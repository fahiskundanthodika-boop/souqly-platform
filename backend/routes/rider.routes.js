// Rider routes - manage delivery staff
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Rider = require('../models/Rider');
const jwt = require('jsonwebtoken');

// GET /api/riders - List all riders for this shop
router.get('/', protect, async (req, res) => {
  try {
    const riders = await Rider.find({ shopId: req.shop._id });
    res.json({ success: true, riders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/riders - Add new rider
router.post('/', protect, async (req, res) => {
  try {
    const rider = await Rider.create({ ...req.body, shopId: req.shop._id });
    res.status(201).json({ success: true, message: 'Rider added!', rider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/riders/login - Rider logs into the rider app using phone + PIN
router.post('/login', async (req, res) => {
  try {
    const { phone, pin } = req.body;
    const rider = await Rider.findOne({ phone, isApproved: true }).select('+pin');

    if (!rider || !(await rider.matchPin(pin))) {
      return res.status(401).json({ success: false, message: 'Invalid phone or PIN.' });
    }

    const token = jwt.sign({ riderId: rider._id, shopId: rider.shopId }, process.env.JWT_SECRET, {
      expiresIn: '30d'
    });

    res.json({ success: true, token, rider: { id: rider._id, name: rider.name, phone: rider.phone } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/riders/:id - Update rider (edit or deactivate)
router.put('/:id', protect, async (req, res) => {
  try {
    const rider = await Rider.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      req.body,
      { new: true }
    );
    res.json({ success: true, message: 'Rider updated!', rider });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Rider App routes (authenticated by rider JWT) ────────────────────────────

const { protectRider } = require('../middleware/auth.middleware');
const Order = require('../models/Order');

// GET /api/riders/me/orders - Get active + recent orders for this rider
router.get('/me/orders', protectRider, async (req, res) => {
  try {
    const orders = await Order.find({
      riderId: req.rider._id,
      orderStatus: { $in: ['out_for_delivery', 'confirmed', 'packing'] }
    }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/riders/me/status - Toggle online/offline
router.put('/me/status', protectRider, async (req, res) => {
  try {
    const { isOnline } = req.body;
    await Rider.findByIdAndUpdate(req.rider._id, { isOnline });
    res.json({ success: true, message: isOnline ? 'You are now online' : 'You are now offline' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/riders/me/order/:orderId/deliver - Mark order as delivered
router.put('/me/order/:orderId/deliver', protectRider, async (req, res) => {
  try {
    const order = await Order.findOneAndUpdate(
      { _id: req.params.orderId, riderId: req.rider._id },
      { orderStatus: 'delivered', paymentStatus: 'paid' },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });

    // Update rider stats
    await Rider.findByIdAndUpdate(req.rider._id, {
      $inc: { totalDeliveries: 1, todayDeliveries: 1 },
      activeOrderId: null
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`shop_${order.shopId}`).emit('order_delivered', { orderId: order._id, orderNumber: order.orderId });
      io.to(`order_${order._id}`).emit('order_status_changed', { status: 'delivered' });
    }

    res.json({ success: true, message: 'Order marked as delivered!', order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/riders/me/fcm-token - Save rider push token
router.put('/me/fcm-token', protectRider, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await Rider.findByIdAndUpdate(req.rider._id, { fcmToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
