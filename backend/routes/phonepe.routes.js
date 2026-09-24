// PhonePe payment routes
const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const { initiatePayment, checkStatus } = require('../services/phonepe.service');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://frontend-flax-kappa-65.vercel.app';
const BACKEND_URL  = process.env.BACKEND_URL  || 'https://yes-production-4a9f.up.railway.app';

// POST /api/phonepe/initiate - Start payment for an order
router.post('/initiate', async (req, res) => {
  try {
    const { orderId, shopSlug } = req.body;
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const result = await initiatePayment({
      orderId: order._id.toString(),
      amount: order.total,
      customerPhone: order.customerPhone,
      redirectUrl: `${FRONTEND_URL}/store/${shopSlug}/order-confirmed?orderId=${order._id}`,
      callbackUrl:  `${BACKEND_URL}/api/phonepe/callback`
    });

    if (result.success) {
      const payUrl = result.data?.instrumentResponse?.redirectInfo?.url;
      res.json({ success: true, payUrl });
    } else {
      res.status(400).json({ success: false, message: result.message || 'Payment initiation failed' });
    }
  } catch (err) {
    console.error('[PhonePe initiate]', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/phonepe/callback - PhonePe sends payment result here
router.post('/callback', async (req, res) => {
  try {
    const { response } = req.body;
    const decoded = JSON.parse(Buffer.from(response, 'base64').toString());

    const txnId  = decoded.data?.merchantTransactionId;
    const status = decoded.code; // PAYMENT_SUCCESS / PAYMENT_ERROR / PAYMENT_PENDING

    if (txnId) {
      const update = {};
      if (status === 'PAYMENT_SUCCESS') {
        update.paymentStatus = 'paid';
        update.orderStatus   = 'confirmed';
        update.merchantTransactionId = txnId;
      } else if (status === 'PAYMENT_ERROR') {
        update.paymentStatus = 'failed';
      }
      if (Object.keys(update).length) {
        await Order.findByIdAndUpdate(txnId, update);
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[PhonePe callback]', err.message);
    res.sendStatus(200); // always 200 to PhonePe
  }
});

// GET /api/phonepe/status/:orderId - Check payment status
router.get('/status/:orderId', async (req, res) => {
  try {
    const result = await checkStatus(req.params.orderId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
