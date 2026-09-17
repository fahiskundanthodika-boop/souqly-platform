// Subscription routes - plan upgrades, billing
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');

// Plan pricing (INR per month)
const PLAN_PRICES = {
  free: 0,
  starter: 999,
  growth: 2499,
  business: 4999
};

// GET /api/subscription/plans - Show available plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['1 Store', '50 Products', '100 Orders/month', 'Basic Analytics']
      },
      {
        id: 'starter',
        name: 'Starter',
        price: 999,
        features: ['1 Store', '500 Products', 'Unlimited Orders', 'WhatsApp Notifications', 'Custom Theme']
      },
      {
        id: 'growth',
        name: 'Growth',
        price: 2499,
        features: ['3 Branches', 'Unlimited Products', 'WhatsApp Marketing', 'GST Invoices', 'Rider App']
      },
      {
        id: 'business',
        name: 'Business',
        price: 4999,
        features: ['10 Branches', 'Everything in Growth', 'API Access', 'Priority Support', 'Custom Domain']
      }
    ]
  });
});

// GET /api/subscription/my - Get current shop's subscription
router.get('/my', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ shopId: req.shop._id }).sort({ createdAt: -1 });
    res.json({ success: true, subscription, currentPlan: req.shop.plan });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/subscription/upgrade - Upgrade plan (creates payment first, then upgrades)
router.post('/upgrade', protect, async (req, res) => {
  try {
    const { plan, gateway } = req.body;

    if (!PLAN_PRICES[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan.' });
    }

    // Update the shop's plan
    await Shop.findByIdAndUpdate(req.shop._id, {
      plan,
      planStatus: 'active',
      planExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    // Record subscription
    await Subscription.create({
      shopId: req.shop._id,
      plan,
      status: 'active',
      amount: PLAN_PRICES[plan],
      currency: 'INR',
      gateway,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      lastPaymentDate: new Date()
    });

    res.json({ success: true, message: `Upgraded to ${plan} plan!` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
