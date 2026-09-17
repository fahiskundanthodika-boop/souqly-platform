// Auth controller - handles signup, login, get profile
const Shop = require('../models/Shop');
const jwt = require('jsonwebtoken');
const slugify = require('slugify');

// Helper: create a JWT token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Helper: send token in response body AND as httpOnly cookie
const sendTokenResponse = (shop, statusCode, res) => {
  const token = createToken(shop._id);

  // httpOnly cookie - JS cannot read this (more secure)
  res.cookie('souqly_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  });

  res.status(statusCode).json({
    success: true,
    token, // also send in body so frontend can store if needed
    shop: {
      id: shop._id,
      name: shop.name,
      slug: shop.slug,
      email: shop.email,
      ownerName: shop.ownerName,
      phone: shop.phone,
      logo: shop.logo,
      plan: shop.plan,
      planStatus: shop.planStatus,
      primaryColor: shop.primaryColor,
      category: shop.category,
      city: shop.city,
      country: shop.country,
    }
  });
};

// POST /api/auth/register - Create a new shop account
const register = async (req, res) => {
  try {
    const { name, ownerName, email, password, phone, category, city, country } = req.body;

    // Check if email already registered
    const existing = await Shop.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This email is already registered. Please login.' });
    }

    // Generate unique slug (used in store URL: /store/johns-bakery)
    let slug = slugify(name, { lower: true, strict: true });
    const slugExists = await Shop.findOne({ slug });
    if (slugExists) slug = `${slug}-${Date.now()}`;

    const shop = await Shop.create({
      name, slug, ownerName,
      email: email.toLowerCase(),
      password, phone, category,
      city, country: country || 'India'
    });

    sendTokenResponse(shop, 201, res);
  } catch (error) {
    // Handle MongoDB duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This email is already registered.' });
    }
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// POST /api/auth/login - Shop owner login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Include password field (hidden by default in schema)
    const shop = await Shop.findOne({ email: email.toLowerCase() }).select('+password');

    if (!shop) {
      return res.status(401).json({ success: false, message: 'No account found with this email.' });
    }

    const isMatch = await shop.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password. Please try again.' });
    }

    if (!shop.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is suspended. Contact support@souqly.app' });
    }

    sendTokenResponse(shop, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// GET /api/auth/me - Get current logged in shop
const getMe = async (req, res) => {
  try {
    const shop = await Shop.findById(req.shop._id);
    res.json({ success: true, shop });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/auth/update - Update shop profile
const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // password change handled separately
    delete updates.email;    // email change needs verification

    const shop = await Shop.findByIdAndUpdate(req.shop._id, updates, {
      new: true,
      runValidators: true
    });

    res.json({ success: true, message: 'Profile updated!', shop });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/auth/logout - Clear the cookie
const logout = (req, res) => {
  res.cookie('souqly_token', '', { httpOnly: true, expires: new Date(0) });
  res.json({ success: true, message: 'Logged out.' });
};

module.exports = { register, login, getMe, updateProfile, logout };
