// Customer auth & profile routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Shop = require('../models/Shop');
const { sendMessage } = require('../services/whatsapp.service');
const { sendOtpSMS, isSmsEnabled } = require('../services/sms.service');

// Middleware to protect customer routes
const protectCustomer = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Not logged in.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.customer = await Customer.findById(decoded.customerId);
    if (!req.customer) return res.status(401).json({ success: false, message: 'Customer not found.' });
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Session expired.' });
  }
};

// POST /api/customer/send-otp
// Customer enters phone number → generate OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, shopId } = req.body;
    if (!phone || !shopId) return res.status(400).json({ success: false, message: 'Phone and shop required.' });

    const shop = await Shop.findById(shopId);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found.' });

    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Find or create customer record for this shop
    let customer = await Customer.findOneAndUpdate(
      { shopId, phone: phone.trim() },
      { otp, otpExpiry },
      { new: true }
    );

    // If customer doesn't exist yet, create minimal record
    if (!customer) {
      customer = await Customer.create({
        shopId,
        phone: phone.trim(),
        name: 'Customer',
        otp,
        otpExpiry
      });
    }

    // Send OTP via WhatsApp if configured
    if (process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'your_meta_access_token') {
      const msg = `🔐 Your ${shop.name} login OTP is: *${otp}*\n\nValid for 10 minutes. Do not share this with anyone.`;
      sendMessage(phone.trim(), msg).catch(() => {});
    }

    // Send OTP via SMS if configured
    if (isSmsEnabled()) {
      sendOtpSMS(phone.trim(), otp).catch(() => {});
    }

    res.json({
      success: true,
      message: 'OTP sent!',
      // Return OTP in dev mode so it can be shown on screen
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer/verify-otp
// Verify OTP and return JWT
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, shopId, otp } = req.body;
    if (!phone || !shopId || !otp) return res.status(400).json({ success: false, message: 'All fields required.' });

    const customer = await Customer.findOne({ shopId, phone: phone.trim() });
    if (!customer) return res.status(404).json({ success: false, message: 'Phone number not found. Place an order first.' });

    if (!customer.otp || customer.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
    if (new Date() > customer.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.' });
    }

    // Clear OTP
    customer.otp = undefined;
    customer.otpExpiry = undefined;
    await customer.save();

    const token = jwt.sign({ customerId: customer._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      customer: {
        _id: customer._id,
        name: customer.name,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customer/me - Get customer profile
router.get('/me', protectCustomer, async (req, res) => {
  res.json({
    success: true,
    customer: {
      _id: req.customer._id,
      name: req.customer.name,
      phone: req.customer.phone,
      email: req.customer.email,
      address: req.customer.address,
      totalOrders: req.customer.totalOrders,
      totalSpent: req.customer.totalSpent,
      loyaltyPoints: req.customer.loyaltyPoints
    }
  });
});

// GET /api/customer/orders - Get customer's order history
router.get('/orders', protectCustomer, async (req, res) => {
  try {
    const orders = await Order.find({
      shopId: req.customer.shopId,
      customerPhone: req.customer.phone
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('orderId items total orderStatus paymentMethod createdAt deliveryCharge');

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customer/loyalty - Get points balance + shop loyalty settings
router.get('/loyalty', protectCustomer, async (req, res) => {
  try {
    const shop = await Shop.findById(req.customer.shopId).select('loyaltySettings name');
    const settings = shop?.loyaltySettings || {};
    const points = req.customer.loyaltyPoints || 0;

    // How much discount can they redeem right now?
    const redemptionRate = settings.redemptionRate || 100; // points per ₹1
    const maxDiscount = Math.floor(points / redemptionRate);

    res.json({
      success: true,
      points,
      maxDiscount,
      settings: {
        enabled: settings.enabled !== false,
        pointsPerRupee: settings.pointsPerRupee || 1,
        redemptionRate,
        minPointsToRedeem: settings.minPointsToRedeem || 100,
        maxRedeemPercent: settings.maxRedeemPercent || 20,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customer/redeem-points - Validate points redemption at checkout
// Returns the discount amount the customer can use
router.post('/redeem-points', protectCustomer, async (req, res) => {
  try {
    const { pointsToRedeem, orderAmount } = req.body;
    const shop = await Shop.findById(req.customer.shopId).select('loyaltySettings');
    const settings = shop?.loyaltySettings || {};

    if (!settings.enabled) {
      return res.status(400).json({ success: false, message: 'Loyalty points not enabled for this shop.' });
    }

    const available = req.customer.loyaltyPoints || 0;
    const minPoints = settings.minPointsToRedeem || 100;
    const redemptionRate = settings.redemptionRate || 100;
    const maxRedeemPercent = settings.maxRedeemPercent || 20;

    if (available < minPoints) {
      return res.status(400).json({
        success: false,
        message: `You need at least ${minPoints} points to redeem. You have ${available}.`
      });
    }

    const requested = Number(pointsToRedeem);
    if (requested > available) {
      return res.status(400).json({ success: false, message: 'Not enough points.' });
    }

    // Calculate discount
    let discount = Math.floor(requested / redemptionRate);

    // Cap at maxRedeemPercent of order
    const maxAllowed = Math.floor((orderAmount * maxRedeemPercent) / 100);
    if (discount > maxAllowed) {
      discount = maxAllowed;
    }

    res.json({
      success: true,
      pointsToRedeem: requested,
      discount,
      message: `${requested} points redeemed for ₹${discount} off!`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
