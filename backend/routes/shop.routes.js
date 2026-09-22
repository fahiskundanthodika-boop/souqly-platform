// Shop routes - manage shop settings, branches
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Shop = require('../models/Shop');
const Branch = require('../models/Branch');
const BranchInventory = require('../models/BranchInventory');
const Product = require('../models/Product');

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

// ── BRANCH ROUTES ────────────────────────────────────────────────

// GET /api/shop/branches - List all branches
router.get('/branches', protect, async (req, res) => {
  try {
    const branches = await Branch.find({ shopId: req.shop._id }).sort({ createdAt: 1 });
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

// PUT /api/shop/branches/:id - Update branch
router.put('/branches/:id', protect, async (req, res) => {
  try {
    const branch = await Branch.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      req.body,
      { new: true }
    );
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
    res.json({ success: true, message: 'Branch updated!', branch });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/shop/branches/:id - Delete branch
router.delete('/branches/:id', protect, async (req, res) => {
  try {
    const branch = await Branch.findOneAndDelete({ _id: req.params.id, shopId: req.shop._id });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
    // Clean up inventory for this branch
    await BranchInventory.deleteMany({ branchId: req.params.id });
    res.json({ success: true, message: 'Branch deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── BRANCH INVENTORY ─────────────────────────────────────────────

// GET /api/shop/branches/:id/inventory - Get stock for all products in a branch
router.get('/branches/:id/inventory', protect, async (req, res) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });

    // Get all products of this shop
    const products = await Product.find({ shopId: req.shop._id, isActive: true }).select('name price image category');
    // Get existing inventory entries
    const inventory = await BranchInventory.find({ branchId: req.params.id });
    const inventoryMap = {};
    inventory.forEach(i => { inventoryMap[i.productId.toString()] = i; });

    // Merge: every product gets a stock entry (0 if not set)
    const result = products.map(p => ({
      productId: p._id,
      name: p.name,
      price: p.price,
      image: p.image,
      category: p.category,
      stock: inventoryMap[p._id.toString()]?.stock ?? 0,
      lowStockAlert: inventoryMap[p._id.toString()]?.lowStockAlert ?? 5,
      inventoryId: inventoryMap[p._id.toString()]?._id ?? null,
    }));

    res.json({ success: true, branch, inventory: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/shop/branches/:id/inventory - Bulk update stock for branch
router.put('/branches/:id/inventory', protect, async (req, res) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });

    const { items } = req.body; // [{ productId, stock, lowStockAlert }]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No inventory items provided.' });
    }

    const ops = items.map(item => ({
      updateOne: {
        filter: { branchId: req.params.id, productId: item.productId },
        update: {
          $set: {
            shopId: req.shop._id,
            stock: Number(item.stock) || 0,
            lowStockAlert: Number(item.lowStockAlert) || 5,
            lastRestocked: new Date(),
          }
        },
        upsert: true,
      }
    }));

    await BranchInventory.bulkWrite(ops);
    res.json({ success: true, message: 'Inventory updated!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/shop/branches/:id/low-stock - Products below low stock alert
router.get('/branches/:id/low-stock', protect, async (req, res) => {
  try {
    const branch = await Branch.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });

    const inventory = await BranchInventory.find({ branchId: req.params.id })
      .populate('productId', 'name price image');

    const lowStock = inventory.filter(i => i.stock <= i.lowStockAlert);
    res.json({ success: true, lowStock });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
