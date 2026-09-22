// WhatsApp routes - Meta WhatsApp Business API
const express = require('express');
const router  = express.Router();
const { protect: verifyToken } = require('../middleware/auth.middleware');
const whatsappService = require('../services/whatsapp.service');
const { sendAbandonedCartReminders } = require('../services/wabot.service');
const WaSession = require('../models/WaSession');

// POST /api/whatsapp/send - Send a WhatsApp message (shop owner)
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { to, message } = req.body;
    const result = await whatsappService.sendMessage(to, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/whatsapp/sessions - Active bot sessions for this shop
router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const sessions = await WaSession.find({
      shopId: req.shop._id,
      expiresAt: { $gt: new Date() }
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/whatsapp/abandoned-reminders - Trigger abandoned cart reminders (cron)
router.post('/abandoned-reminders', async (req, res) => {
  // Simple secret check so it can be triggered by a cron service
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const count = await sendAbandonedCartReminders();
    res.json({ success: true, reminders_sent: count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
