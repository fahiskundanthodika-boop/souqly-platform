const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Shop = require('../models/Shop');

// GET current theme (authenticated)
router.get('/', protect, async (req, res) => {
  try {
    const shop = await Shop.findById(req.shop._id).select('theme themeColors colorScheme').lean();
    res.json({ success: true, theme: shop });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// SAVE selected theme
router.put('/select', protect, async (req, res) => {
  try {
    const { theme, colorScheme, themeColors } = req.body;
    const shop = await Shop.findByIdAndUpdate(
      req.shop._id,
      { theme, colorScheme, themeColors },
      { new: true }
    ).select('theme themeColors colorScheme');
    res.json({ success: true, shop });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET theme for customer store (public)
router.get('/store/:shopSlug', async (req, res) => {
  try {
    const shop = await Shop.findOne({ slug: req.params.shopSlug })
      .select('theme themeColors colorScheme name primaryColor').lean();
    if (!shop) return res.status(404).json({ success: false, error: 'Shop not found' });
    res.json({ success: true, theme: shop });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
