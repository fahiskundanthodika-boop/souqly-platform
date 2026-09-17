// Review routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Review = require('../models/Review');
const Order = require('../models/Order');
const Shop = require('../models/Shop');

// POST /api/reviews - Customer submits review (no login needed, linked to order)
router.post('/', async (req, res) => {
  try {
    const { orderId, rating, comment, customerName, customerPhone } = req.body;
    if (!orderId || !rating || !customerName || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Order ID, rating and your name are required.' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    // Make sure order exists and is delivered
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ success: false, message: 'You can only review delivered orders.' });
    }

    const review = await Review.create({
      shopId: order.shopId,
      orderId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      rating: Number(rating),
      comment: comment?.trim() || ''
    });

    // Update shop average rating
    const reviews = await Review.find({ shopId: order.shopId, isVisible: true });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Shop.findByIdAndUpdate(order.shopId, {
      avgRating: Math.round(avg * 10) / 10,
      totalReviews: reviews.length
    });

    res.status(201).json({ success: true, review, message: 'Thank you for your review!' });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'You have already reviewed this order.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews/shop/:shopId - Public: get shop reviews
router.get('/shop/:shopId', async (req, res) => {
  try {
    const reviews = await Review.find({ shopId: req.params.shopId, isVisible: true })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews - Owner: get all reviews for their shop
router.get('/', protect, async (req, res) => {
  try {
    const reviews = await Review.find({ shopId: req.shop._id })
      .sort({ createdAt: -1 })
      .populate('orderId', 'orderId total');
    res.json({ success: true, reviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/reviews/:id/visibility - Owner: show/hide a review
router.put('/:id/visibility', protect, async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!review) return res.status(404).json({ success: false, message: 'Review not found.' });
    review.isVisible = !review.isVisible;
    await review.save();

    // Recalculate shop average
    const reviews = await Review.find({ shopId: req.shop._id, isVisible: true });
    const avg = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
    await Shop.findByIdAndUpdate(req.shop._id, {
      avgRating: Math.round(avg * 10) / 10,
      totalReviews: reviews.length
    });

    res.json({ success: true, isVisible: review.isVisible });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reviews/check/:orderId - Check if order already reviewed
router.get('/check/:orderId', async (req, res) => {
  try {
    const review = await Review.findOne({ orderId: req.params.orderId });
    res.json({ success: true, reviewed: !!review, review: review || null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
