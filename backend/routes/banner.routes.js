const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Banner  = require('../models/Banner');

// GET all banners for the authenticated shop
router.get('/', protect, async (req, res) => {
  try {
    const banners = await Banner.find({ shopId: req.shop._id }).sort({ type: 1, order: 1 });
    res.json({ success: true, banners });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET banners for a customer store (public)
router.get('/store/:shopSlug', async (req, res) => {
  try {
    const Shop = require('../models/Shop');
    const shop = await Shop.findOne({ slug: req.params.shopSlug });
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    const banners = await Banner.find({ shopId: shop._id, isActive: true }).sort({ type: 1, order: 1 });
    res.json({ success: true, banners });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// CREATE banner
router.post('/', protect, async (req, res) => {
  try {
    const banner = await Banner.create({ ...req.body, shopId: req.shop._id });
    res.json({ success: true, banner });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// UPDATE banner
router.put('/:id', protect, async (req, res) => {
  try {
    const banner = await Banner.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      req.body, { new: true }
    );
    if (!banner) return res.status(404).json({ success: false, error: 'Banner not found' });
    res.json({ success: true, banner });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// TOGGLE active/inactive — must be before /:id routes to avoid conflict
router.patch('/reorder', protect, async (req, res) => {
  try {
    const { bannerIds } = req.body;
    await Promise.all(bannerIds.map((id, index) => Banner.findByIdAndUpdate(id, { order: index })));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const banner = await Banner.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!banner) return res.status(404).json({ success: false, error: 'Banner not found' });
    banner.isActive = !banner.isActive;
    await banner.save();
    res.json({ success: true, banner });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE banner
router.delete('/:id', protect, async (req, res) => {
  try {
    await Banner.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
