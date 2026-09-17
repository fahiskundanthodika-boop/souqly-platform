// Payment routes - PhonePe (India) and Stripe (GCC/International)
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const axios = require('axios');
const crypto = require('crypto');

// POST /api/payment/phonepe/initiate - Start PhonePe payment
router.post('/phonepe/initiate', async (req, res) => {
  try {
    const { amount, orderId, customerPhone, redirectUrl } = req.body;

    // PhonePe v2 API - OAuth based payment initiation
    // Step 1: Get access token
    const tokenResponse = await axios.post(
      `https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token`,
      new URLSearchParams({
        client_id: process.env.PHONEPE_CLIENT_ID,
        client_secret: process.env.PHONEPE_CLIENT_SECRET,
        client_version: process.env.PHONEPE_CLIENT_VERSION || '1',
        grant_type: 'client_credentials'
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Initiate payment
    const paymentPayload = {
      merchantOrderId: orderId,
      amount: amount * 100, // PhonePe uses paise (1 INR = 100 paise)
      paymentFlow: {
        type: 'PG_CHECKOUT',
        message: 'Payment for Souqly Order',
        merchantUrls: {
          redirectUrl: redirectUrl || `${process.env.FRONTEND_URL}/payment/success`
        }
      }
    };

    const paymentResponse = await axios.post(
      `https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay`,
      paymentPayload,
      {
        headers: {
          'Authorization': `O-Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, data: paymentResponse.data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
  }
});

// POST /api/payment/stripe/create-intent - Start Stripe payment (GCC)
router.post('/stripe/create-intent', async (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { amount, currency = 'aed', orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe uses smallest currency unit
      currency,
      metadata: { orderId }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/payment/stripe/webhook - Stripe sends payment confirmation here
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  if (event.type === 'payment_intent.succeeded') {
    const orderId = event.data.object.metadata.orderId;
    // TODO: Update order paymentStatus to 'paid'
    console.log(`✅ Payment received for order: ${orderId}`);
  }

  res.json({ received: true });
});

module.exports = router;
