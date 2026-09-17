// Auth middleware - checks JWT from cookie or Authorization header
const jwt = require('jsonwebtoken');
const Shop = require('../models/Shop');

const protect = async (req, res, next) => {
  let token;

  // Check httpOnly cookie first (web browser)
  if (req.cookies && req.cookies.souqly_token) {
    token = req.cookies.souqly_token;
  }
  // Fallback: check Authorization header (mobile apps, Postman)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not logged in. Please login to continue.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.shop = await Shop.findById(decoded.id);

    if (!req.shop) {
      return res.status(401).json({ success: false, message: 'Account not found.' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired. Please login again.' });
  }
};

const superAdmin = (req, res, next) => {
  if (req.shop && req.shop.email === process.env.SUPER_ADMIN_EMAIL) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Super admin access required.' });
  }
};

const Rider = require('../models/Rider');

const protectRider = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not logged in.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.rider = await Rider.findById(decoded.riderId);
    if (!req.rider) return res.status(401).json({ success: false, message: 'Rider not found.' });
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Session expired.' });
  }
};

module.exports = { protect, superAdmin, protectRider };
