// Coupon routes
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Coupon = require('../models/Coupon');

// GET /api/coupons - Owner: list all coupons
router.get('/', protect, async (req, res) => {
  try {
    const coupons = await Coupon.find({ shopId: req.shop._id }).sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/coupons - Owner: create coupon
router.post('/', protect, async (req, res) => {
  try {
    const { code, type, value, minOrderAmount, maxDiscount, usageLimit, expiresAt } = req.body;
    if (!code || !type || !value) return res.status(400).json({ success: false, message: 'Code, type and value are required.' });

    const coupon = await Coupon.create({
      shopId: req.shop._id,
      code: code.toUpperCase().trim(),
      type, value: Number(value),
      minOrderAmount: Number(minOrderAmount) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      usageLimit: Number(usageLimit) || 0,
      expiresAt: expiresAt || null
    });

    res.status(201).json({ success: true, coupon });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'This coupon code already exists.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/coupons/:id/toggle - Owner: enable/disable coupon
router.put('/:id/toggle', protect, async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found.' });
    coupon.isActive = !coupon.isActive;
    await coupon.save();
    res.json({ success: true, isActive: coupon.isActive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/coupons/:id - Owner: delete coupon
router.delete('/:id', protect, async (req, res) => {
  try {
    await Coupon.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
    res.json({ success: true, message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/coupons/apply - Customer: validate and apply coupon
router.post('/apply', async (req, res) => {
  try {
    const { code, shopId, orderAmount } = req.body;
    if (!code || !shopId || !orderAmount) return res.status(400).json({ success: false, message: 'Code, shop and order amount required.' });

    const coupon = await Coupon.findOne({ shopId, code: code.toUpperCase().trim(), isActive: true });
    if (!coupon) return res.status(404).json({ success: false, message: 'Invalid or expired coupon code.' });

    // Check expiry
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ success: false, message: 'This coupon has expired.' });
    }

    // Check usage limit
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its usage limit.' });
    }

    // Check minimum order
    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({ success: false, message: `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon.` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.round((orderAmount * coupon.value) / 100);
      if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
    } else {
      discount = coupon.value;
    }
    discount = Math.min(discount, orderAmount); // can't discount more than order total

    res.json({
      success: true,
      discount,
      couponId: coupon._id,
      message: coupon.type === 'percent'
        ? `${coupon.value}% off applied! You save ₹${discount}`
        : `₹${discount} off applied!`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
