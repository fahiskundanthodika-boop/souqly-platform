// WhatsApp Business API connection for shop owners
// Each shop owner connects their own Meta WhatsApp number here
const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { protect } = require('../middleware/auth.middleware');
const Shop = require('../models/Shop');

const WA_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
const BASE = `https://graph.facebook.com/${WA_VERSION}`;

// POST /api/wa-connect/embedded-signup
// Exchange Meta embedded-signup authorization code for tokens, then save
router.post('/embedded-signup', protect, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ success: false, message: 'Authorization code is required.' });

  try {
    // 1. Exchange code for short-lived user access token
    const tokenRes = await axios.get(`${BASE}/oauth/access_token`, {
      params: {
        client_id:     process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        code,
      },
    });
    let accessToken = tokenRes.data.access_token;

    // 2. Exchange for long-lived token (optional but preferred)
    try {
      const llRes = await axios.get(`${BASE}/oauth/access_token`, {
        params: {
          grant_type:        'fb_exchange_token',
          client_id:         process.env.META_APP_ID,
          client_secret:     process.env.META_APP_SECRET,
          fb_exchange_token: accessToken,
        },
      });
      if (llRes.data.access_token) accessToken = llRes.data.access_token;
    } catch (_) {
      // proceed with short-lived token
    }

    // 3. Get WhatsApp Business Accounts linked to this token
    const wabaRes = await axios.get(`${BASE}/me/whatsapp_business_accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const waba = wabaRes.data.data?.[0];
    if (!waba) return res.status(400).json({ success: false, message: 'No WhatsApp Business Account found on this Meta account.' });

    // 4. Get Phone Numbers for this WABA
    const phoneRes = await axios.get(`${BASE}/${waba.id}/phone_numbers`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const phoneEntry = phoneRes.data.data?.[0];
    if (!phoneEntry) return res.status(400).json({ success: false, message: 'No phone numbers found in this WhatsApp Business Account.' });

    const phoneNumberId  = phoneEntry.id;
    const phoneNumber    = phoneEntry.display_phone_number || '';
    const businessName   = waba.name || '';

    // 5. Save to shop
    await Shop.findByIdAndUpdate(req.shop._id, {
      'whatsappApi.phoneNumberId':  phoneNumberId,
      'whatsappApi.wabaId':         waba.id,
      'whatsappApi.accessToken':    accessToken,
      'whatsappApi.businessNumber': phoneNumber,
      'whatsappApi.connected':      true,
      'whatsappApi.connectedAt':    new Date(),
    });

    res.json({ success: true, phone: phoneNumber, businessName, phoneNumberId, wabaId: waba.id });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.status(400).json({ success: false, message: `Embedded signup failed: ${errMsg}` });
  }
});

// POST /api/wa-connect/connect
// Shop owner saves their Meta phone_number_id + access_token manually
router.post('/connect', protect, async (req, res) => {
  const { phoneNumberId, accessToken, businessNumber } = req.body;

  if (!phoneNumberId || !accessToken) {
    return res.status(400).json({ success: false, message: 'Phone Number ID and Access Token are required.' });
  }

  try {
    const verifyRes = await axios.get(
      `${BASE}/${phoneNumberId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const metaPhone = verifyRes.data?.display_phone_number || businessNumber || '';

    // Try to get WABA id
    let wabaId = '';
    try {
      const wabaRes = await axios.get(`${BASE}/me/whatsapp_business_accounts`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      wabaId = wabaRes.data.data?.[0]?.id || '';
    } catch (_) {}

    await Shop.findByIdAndUpdate(req.shop._id, {
      'whatsappApi.phoneNumberId':  phoneNumberId,
      'whatsappApi.wabaId':         wabaId,
      'whatsappApi.accessToken':    accessToken,
      'whatsappApi.businessNumber': metaPhone,
      'whatsappApi.connected':      true,
      'whatsappApi.connectedAt':    new Date()
    });

    res.json({ success: true, message: 'WhatsApp number connected successfully!', phoneNumber: metaPhone, wabaId });
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    res.status(400).json({ success: false, message: `Invalid credentials: ${errMsg}` });
  }
});

// POST /api/wa-connect/disconnect
router.post('/disconnect', protect, async (req, res) => {
  await Shop.findByIdAndUpdate(req.shop._id, {
    'whatsappApi.phoneNumberId':  '',
    'whatsappApi.wabaId':         '',
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
    wabaId: shop.whatsappApi?.wabaId || '',
    connectedAt: shop.whatsappApi?.connectedAt || null,
    botLink: shop.whatsappApi?.connected
      ? `https://wa.me/${(shop.whatsappApi.businessNumber || '').replace(/\D/g, '')}?text=hi`
      : null
  });
});

module.exports = router;
