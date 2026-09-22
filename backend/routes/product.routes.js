// Product routes - full CRUD + image upload + toggle + stock
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Product = require('../models/Product');

// Only load Cloudinary upload if credentials are set
let uploadProduct;
try {
  const cloudinaryConfig = require('../config/cloudinary');
  uploadProduct = cloudinaryConfig.uploadProduct;
} catch (e) {
  // Cloudinary not configured yet - use memory storage fallback
  const multer = require('multer');
  uploadProduct = multer({ storage: multer.memoryStorage() });
}

// ─── PUBLIC ROUTES (no login needed) ───────────────────────────────

// GET /api/products/public/:shopId - Customer store product list
router.get('/public/:shopId', async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = { shopId: req.params.shopId, isAvailable: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;

    const products = await Product.find(query)
      .select('-batchNumber -hsnCode -gstRate')
      .sort({ isFeatured: -1, createdAt: -1 });

    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── OWNER ROUTES (login required) ────────────────────────────────

// GET /api/products - All products for this shop (with search + filter)
router.get('/', protect, async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = { shopId: req.shop._id };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category && category !== 'all') query.category = category;

    const products = await Product.find(query).sort({ createdAt: -1 });

    // Get all unique categories for filter tabs
    const allProducts = await Product.find({ shopId: req.shop._id }).distinct('category');
    const categories = allProducts.filter(Boolean);

    res.json({ success: true, count: products.length, products, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products - Add new product (with optional image upload)
router.post('/', protect, uploadProduct.single('image'), async (req, res) => {
  try {
    const productData = {
      ...req.body,
      shopId: req.shop._id,
      price: Number(req.body.price),
      mrp: req.body.mrp ? Number(req.body.mrp) : undefined,
      stock: req.body.stock ? Number(req.body.stock) : 999,
      gstRate: req.body.gstRate ? Number(req.body.gstRate) : 0,
    };

    // If image was uploaded to Cloudinary, save its URL
    if (req.file) {
      productData.image = req.file.path || req.file.secure_url;
    }

    const product = await Product.create(productData);
    res.status(201).json({ success: true, message: 'Product added!', product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/products/:id - Edit product (with optional new image)
router.put('/:id', protect, uploadProduct.single('image'), async (req, res) => {
  try {
    const updates = {
      ...req.body,
      price: req.body.price ? Number(req.body.price) : undefined,
      mrp: req.body.mrp ? Number(req.body.mrp) : undefined,
      stock: req.body.stock !== undefined ? Number(req.body.stock) : undefined,
    };

    // Remove undefined values
    Object.keys(updates).forEach(k => updates[k] === undefined && delete updates[k]);

    if (req.file) {
      updates.image = req.file.path || req.file.secure_url;
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      updates,
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product updated!', product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', protect, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      shopId: req.shop._id
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/products/:id/toggle - Toggle available/unavailable
router.patch('/:id/toggle', protect, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });

    product.isAvailable = !product.isAvailable;
    await product.save();

    res.json({
      success: true,
      message: `Product ${product.isAvailable ? 'made available' : 'hidden from store'}`,
      isAvailable: product.isAvailable
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/products/:id/stock - Update stock quantity
router.patch('/:id/stock', protect, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ success: false, message: 'Valid stock quantity required.' });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, shopId: req.shop._id },
      { stock: Number(stock) },
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
    res.json({ success: true, message: 'Stock updated!', product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/products/bulk-upload - Upload Excel or CSV to add multiple products
const multer = require('multer');
const XLSX   = require('xlsx');
const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/bulk-upload', protect, memUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    const ext = req.file.originalname.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return res.status(400).json({ success: false, message: 'Only .xlsx, .xls, or .csv files allowed.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    const rows     = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) return res.status(400).json({ success: false, message: 'File is empty.' });

    const products = [];
    const errors   = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      // Accept flexible column names (Name/name/Product Name, Price/price, etc.)
      const name  = r['Name'] || r['name'] || r['Product Name'] || r['product_name'] || '';
      const price = parseFloat(r['Price'] || r['price'] || r['MRP'] || 0);
      const cat   = r['Category'] || r['category'] || r['Type'] || 'General';
      const desc  = r['Description'] || r['description'] || r['Desc'] || '';
      const unit  = r['Unit'] || r['unit'] || 'piece';
      const stock = parseInt(r['Stock'] || r['stock'] || 999);
      const mrp   = parseFloat(r['MRP'] || r['mrp'] || r['Original Price'] || price);

      if (!name) { errors.push(`Row ${i + 2}: Name is required`); continue; }
      if (!price || price <= 0) { errors.push(`Row ${i + 2}: Valid price required`); continue; }

      products.push({ shopId: req.shop._id, name: name.trim(), price, mrp, category: cat.trim(), description: desc.trim(), unit: unit.trim(), stock, isAvailable: true });
    }

    const inserted = await Product.insertMany(products, { ordered: false });

    res.json({
      success: true,
      message: `${inserted.length} products added successfully!`,
      added: inserted.length,
      skipped: errors.length,
      errors: errors.slice(0, 10) // return first 10 errors
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/products/template - Download sample Excel template
router.get('/template', protect, (req, res) => {
  const XLSX = require('xlsx');
  const data = [
    { Name: 'White Bread', Price: 45, MRP: 50, Category: 'Breads', Unit: 'piece', Stock: 100, Description: 'Fresh white bread' },
    { Name: 'Chocolate Cake', Price: 350, MRP: 400, Category: 'Cakes', Unit: 'piece', Stock: 20, Description: '500g chocolate cake' },
    { Name: 'Butter', Price: 55, MRP: 60, Category: 'Dairy', Unit: '100g', Stock: 50, Description: 'Fresh butter' },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', 'attachment; filename=souqly-products-template.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

module.exports = router;
