// Subscription routes - plan upgrades with PhonePe billing
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/auth.middleware');
const Subscription = require('../models/Subscription');
const Shop = require('../models/Shop');

const PLAN_PRICES = {
  free: 0,
  starter: 999,
  growth: 2499,
  business: 4999
};

const PLAN_FEATURES = {
  free:     { branches: 1, products: 50,  orders: 100,  label: 'Free' },
  starter:  { branches: 1, products: 500, orders: -1,   label: 'Starter' },
  growth:   { branches: 3, products: -1,  orders: -1,   label: 'Growth' },
  business: { branches: 10, products: -1, orders: -1,   label: 'Business' },
};

// GET /api/subscription/plans
router.get('/plans', (req, res) => {
  res.json({
    success: true,
    plans: [
      {
        id: 'free', name: 'Free', price: 0,
        features: ['1 Branch', '50 Products', '100 Orders/month', 'Basic Analytics']
      },
      {
        id: 'starter', name: 'Starter', price: 999,
        features: ['1 Branch', '500 Products', 'Unlimited Orders', 'WhatsApp Notifications', 'Loyalty Points']
      },
      {
        id: 'growth', name: 'Growth', price: 2499,
        features: ['3 Branches', 'Unlimited Products', 'WhatsApp Marketing', 'GST Invoices', 'Rider App', 'SMS Notifications']
      },
      {
        id: 'business', name: 'Business', price: 4999,
        features: ['10 Branches', 'Everything in Growth', 'API Access', 'Priority Support', 'Custom Domain']
      }
    ]
  });
});

// GET /api/subscription/my
router.get('/my', protect, async (req, res) => {
  try {
    const subscription = await Subscription.findOne({ shopId: req.shop._id }).sort({ createdAt: -1 });
    res.json({ success: true, subscription, currentPlan: req.shop.plan, planExpiresAt: req.shop.planExpiresAt });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/subscription/initiate - Start PhonePe payment for a plan
router.post('/initiate', protect, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLAN_PRICES[plan] || plan === 'free') {
      return res.status(400).json({ success: false, message: 'Invalid plan or cannot pay for free plan.' });
    }

    const amount = PLAN_PRICES[plan];
    const merchantOrderId = `SUB_${req.shop._id}_${plan}_${Date.now()}`;

    // Step 1: Get PhonePe access token
    const tokenRes = await axios.post(
      process.env.PHONEPE_ENV === 'production'
        ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
      new URLSearchParams({
        client_id: process.env.PHONEPE_CLIENT_ID,
        client_secret: process.env.PHONEPE_CLIENT_SECRET,
        client_version: process.env.PHONEPE_CLIENT_VERSION || '1',
        grant_type: 'client_credentials'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;
    const baseUrl = process.env.PHONEPE_ENV === 'production'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    // Step 2: Initiate payment
    const paymentRes = await axios.post(
      `${baseUrl}/checkout/v2/pay`,
      {
        merchantOrderId,
        amount: amount * 100, // paise
        paymentFlow: {
          type: 'PG_CHECKOUT',
          message: `Souqly ${plan} plan - ₹${amount}/month`,
          merchantUrls: {
            redirectUrl: `${process.env.FRONTEND_URL}/dashboard/billing/verify?orderId=${merchantOrderId}&plan=${plan}`
          }
        }
      },
      {
        headers: {
          'Authorization': `O-Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Save pending subscription record
    await Subscription.create({
      shopId: req.shop._id,
      plan,
      status: 'active',
      amount,
      currency: 'INR',
      gateway: 'phonepe',
      gatewaySubId: merchantOrderId,
    });

    res.json({
      success: true,
      redirectUrl: paymentRes.data.redirectUrl,
      merchantOrderId,
      plan,
      amount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// POST /api/subscription/verify - Called after PhonePe redirect to confirm payment
router.post('/verify', protect, async (req, res) => {
  try {
    const { merchantOrderId, plan } = req.body;
    if (!merchantOrderId || !plan) {
      return res.status(400).json({ success: false, message: 'Missing orderId or plan.' });
    }

    // Get token then check payment status with PhonePe
    const tokenRes = await axios.post(
      process.env.PHONEPE_ENV === 'production'
        ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
        : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
      new URLSearchParams({
        client_id: process.env.PHONEPE_CLIENT_ID,
        client_secret: process.env.PHONEPE_CLIENT_SECRET,
        client_version: process.env.PHONEPE_CLIENT_VERSION || '1',
        grant_type: 'client_credentials'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;
    const baseUrl = process.env.PHONEPE_ENV === 'production'
      ? 'https://api.phonepe.com/apis/pg'
      : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

    const statusRes = await axios.get(
      `${baseUrl}/checkout/v2/order/${merchantOrderId}/status`,
      { headers: { 'Authorization': `O-Bearer ${accessToken}` } }
    );

    const orderStatus = statusRes.data?.state;

    if (orderStatus === 'COMPLETED') {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Activate plan
      await Shop.findByIdAndUpdate(req.shop._id, {
        plan,
        planStatus: 'active',
        planExpiresAt: expiresAt
      });

      // Update subscription record
      await Subscription.findOneAndUpdate(
        { shopId: req.shop._id, gatewaySubId: merchantOrderId },
        {
          status: 'active',
          lastPaymentDate: new Date(),
          nextBillingDate: expiresAt
        }
      );

      return res.json({ success: true, message: `${plan} plan activated!`, plan, expiresAt });
    }

    if (orderStatus === 'FAILED') {
      await Subscription.findOneAndDelete({ shopId: req.shop._id, gatewaySubId: merchantOrderId });
      return res.status(400).json({ success: false, message: 'Payment failed. Please try again.' });
    }

    // PENDING
    res.json({ success: false, message: 'Payment is still pending. Please wait.', state: orderStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// POST /api/subscription/downgrade - Downgrade to free (no payment needed)
router.post('/downgrade', protect, async (req, res) => {
  try {
    await Shop.findByIdAndUpdate(req.shop._id, {
      plan: 'free',
      planStatus: 'active',
      planExpiresAt: null
    });
    res.json({ success: true, message: 'Downgraded to Free plan.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/subscription/history - All past subscriptions
router.get('/history', protect, async (req, res) => {
  try {
    const history = await Subscription.find({ shopId: req.shop._id }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
