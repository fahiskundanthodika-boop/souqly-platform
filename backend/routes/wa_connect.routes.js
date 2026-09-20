// WhatsApp Business API connection for shop owners
// Each shop owner connects their own Meta WhatsApp number here
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { protect } = require('../middleware/auth.middleware');
const Shop = require('../models/Shop');

// POST /api/wa-connect/embedded-signup
// Exchange Meta embedded-signup authorization code for tokens, then save
router.post('/embedded-signup', protect, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Authorization code is required.' });

  try {
    // 1. Exchange code for access token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id:     process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code,
      },
    });
    const accessToken = tokenRes.data.access_token;

    // 2. Get WhatsApp Business Accounts linked to this token
    const wabaRes = await axios.get('https://graph.facebook.com/v18.0/me/whatsapp_business_accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const waba = wabaRes.data.data?.[0];
    if (!waba) return res.status(400).json({ success: false, message: 'No WhatsApp Business Account found on this Meta account.' });

    // 3. Get Phone Numbers for this WABA
    const phoneRes = await axios.get(`https://graph.facebook.com/v18.0/${waba.id}/phone_numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const phoneEntry = phoneRes.data.data?.[0];
    if (!phoneEntry) return res.status(400).json({ success: false, message: 'No phone numbers found in this WhatsApp Business Account.' });

    const phoneNumberId  = phoneEntry.id;
    const phoneNumber    = phoneEntry.display_phone_number || '';
    const businessName   = waba.name || '';

    // 4. Save to shop
    await Shop.findByIdAndUpdate(req.shop._id, {
      'whatsappApi.phoneNumberId':  phoneNumberId,
      'whatsappApi.accessToken':    accessToken,
      'whatsappApi.businessNumber': phoneNumber,
      'whatsappApi.connected':      true,
      'whatsappApi.connectedAt':    new Date(),
    });

    res.json({ success: true, phone: phoneNumber, businessName, phoneNumberId });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.status(400).json({ success: false, message: `Embedded signup failed: ${errMsg}` });
  }
});

// POST /api/wa-connect/connect
// Shop owner saves their Meta phone_number_id + access_token
router.post('/connect', protect, async (req, res) => {
  const { phoneNumberId, accessToken, businessNumber } = req.body;

  if (!phoneNumberId || !accessToken) {
    return res.status(400).json({ success: false, message: 'Phone Number ID and Access Token are required.' });
  }

  // Verify credentials by calling Meta API
  try {
    const verifyRes = await axios.get(
      `https://graph.facebook.com/v18.0/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const metaPhone = verifyRes.data?.display_phone_number || businessNumber || '';

    await Shop.findByIdAndUpdate(req.shop._id, {
      'whatsappApi.phoneNumberId':  phoneNumberId,
      'whatsappApi.accessToken':    accessToken,
      'whatsappApi.businessNumber': metaPhone,
      'whatsappApi.connected':      true,
      'whatsappApi.connectedAt':    new Date()
    });

    res.json({
      success: true,
      message: 'WhatsApp number connected successfully!',
      phoneNumber: metaPhone
    });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.status(400).json({
      success: false,
      message: `Invalid credentials: ${errMsg}`
    });
  }
});

// POST /api/wa-connect/disconnect
router.post('/disconnect', protect, async (req, res) => {
  await Shop.findByIdAndUpdate(req.shop._id, {
    'whatsappApi.phoneNumberId':  '',
    'whatsappApi.accessToken':    '',
    'whatsappApi.businessNumber': '',
    'whatsappApi.connected':      false,
  });
  res.json({ success: true, message: 'WhatsApp number disconnected.' });
});

// GET /api/wa-connect/status
router.get('/status', protect, async (req, res) => {
  const shop = await Shop.findById(req.shop._id).select('whatsappApi slug name').lean();
  res.json({
    success: true,
    connected: shop.whatsappApi?.connected || false,
    businessNumber: shop.whatsappApi?.businessNumber || '',
    connectedAt: shop.whatsappApi?.connectedAt || null,
    botLink: shop.whatsappApi?.connected
      ? `https://wa.me/${(shop.whatsappApi.businessNumber || '').replace(/\D/g, '')}?text=hi`
      : null
  });
});

module.exports = router;
