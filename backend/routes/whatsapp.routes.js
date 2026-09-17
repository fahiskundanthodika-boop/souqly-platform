// WhatsApp routes - Meta WhatsApp Business API webhook
const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp.service');

// GET /api/whatsapp/webhook - Meta verification (one-time setup)
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ WhatsApp Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ message: 'Verification failed.' });
  }
});

// POST /api/whatsapp/webhook - Receive incoming WhatsApp messages
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages;

      if (messages && messages.length > 0) {
        const message = messages[0];
        console.log('📩 WhatsApp message received:', message.text?.body);
        // TODO: Process order from WhatsApp chat
      }
    }

    res.sendStatus(200); // Must respond 200 quickly or Meta will retry
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.sendStatus(200);
  }
});

// POST /api/whatsapp/send - Send a WhatsApp message
router.post('/send', async (req, res) => {
  try {
    const { to, message, templateName, templateParams } = req.body;
    const result = await whatsappService.sendMessage(to, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
