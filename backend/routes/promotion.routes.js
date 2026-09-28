const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Promotion = require('../models/Promotion');
const Product = require('../models/Product');

function computeStatus(p) {
  const now = new Date();
  if (p.status === 'paused') return 'paused';
  if (p.autoExpire && now > new Date(p.endDate)) return 'ended';
  if (now < new Date(p.startDate)) return 'scheduled';
  return 'active';
}

// Apply discount rule to a price
function applyDiscount(price, discount) {
  if (!discount) return { salePrice: price, saved: 0 };
  let salePrice = price;
  if (discount.type === 'percent') {
    salePrice = price - (price * discount.value / 100);
  } else if (discount.type === 'flat') {
    salePrice = Math.max(0, price - discount.value);
  }
  // bogo: price stays same per unit (handled at cart level)
  return { salePrice: Math.round(salePrice * 100) / 100, saved: Math.round((price - salePrice) * 100) / 100 };
}

// POST /api/promotions — create
router.post('/', protect, async (req, res) => {
  try {
    const { name, bannerText, startDate, endDate, autoExpire, target, discount } = req.body;
    const now = new Date();
    let status = 'scheduled';
    if (new Date(startDate) <= now && new Date(endDate) >= now) status = 'active';

    const promo = await Promotion.create({
      shopId: req.shop._id, name, bannerText, startDate, endDate,
      autoExpire: autoExpire !== false, target, discount, status
    });
    res.json({ success: true, promotion: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotions — list all for shop
router.get('/', protect, async (req, res) => {
  try {
    const promos = await Promotion.find({ shopId: req.shop._id }).sort({ createdAt: -1 });
    // Recompute live status
    const enriched = promos.map(p => {
      const obj = p.toObject();
      obj.liveStatus = computeStatus(p);
      return obj;
    });
    res.json({ success: true, promotions: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotions/active — public, used by store frontend
router.get('/active', async (req, res) => {
  try {
    const { shopId } = req.query;
    if (!shopId) return res.status(400).json({ success: false, message: 'shopId required' });

    const now = new Date();
    const promos = await Promotion.find({
      shopId,
      status: { $ne: 'paused' },
      startDate: { $lte: now },
      endDate:   { $gte: now },
    });
    res.json({ success: true, promotions: promos });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/promotions/:id — edit
router.put('/:id', protect, async (req, res) => {
  try {
    const promo = await Promotion.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      req.body,
      { new: true }
    );
    if (!promo) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, promotion: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/promotions/:id/pause — toggle pause
router.patch('/:id/pause', protect, async (req, res) => {
  try {
    const promo = await Promotion.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!promo) return res.status(404).json({ success: false, message: 'Not found' });
    promo.status = promo.status === 'paused' ? computeStatus({ ...promo.toObject(), status: 'active' }) : 'paused';
    await promo.save();
    res.json({ success: true, promotion: promo });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/promotions/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await Promotion.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/promotions/preview — calculate discounted price for preview
router.post('/preview', protect, async (req, res) => {
  try {
    const { price, discount } = req.body;
    const result = applyDiscount(price, discount);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
module.exports.applyDiscount = applyDiscount;
module.exports.computeStatus = computeStatus;
