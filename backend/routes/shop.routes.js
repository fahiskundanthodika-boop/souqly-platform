// Shop routes - manage shop settings, branches
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Shop = require('../models/Shop');
const Branch = require('../models/Branch');

// GET /api/shop/public/:slug - Public store page (no login needed)
router.get('/public/:slug', async (req, res) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.slug, isActive: true })
      .select('-password -gstNumber -paymentOptions.upiId');
    if (!shop) return res.status(404).json({ success: false, message: 'Store not found.' });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/shop/my - Get current shop details (login required)
router.get('/my', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.shop._id);
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/shop/settings - Update shop settings
router.put('/settings', protect, async (req, res) => {
  try {
    const shop = await Shop.findByIdAndUpdate(req.shop._id, req.body, { new: true });
    res.json({ success: true, message: 'Settings saved!', shop });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/shop/fcm-token - Save owner app's push notification token
router.put('/fcm-token', protect, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return res.status(400).json({ success: false, message: 'fcmToken is required.' });
    await Shop.findByIdAndUpdate(req.shop._id, { fcmToken });
    res.json({ success: true, message: 'Push token saved!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/shop/branches - List all branches
router.get('/branches', protect, async (req, res) => {
  try {
    const branches = await Branch.find({ shopId: req.shop._id });
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/shop/branches - Add new branch
router.post('/branches', protect, async (req, res) => {
  try {
    const branch = await Branch.create({ ...req.body, shopId: req.shop._id });
    res.status(201).json({ success: true, message: 'Branch added!', branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
