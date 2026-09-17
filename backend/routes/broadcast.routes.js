// Broadcast routes - WhatsApp marketing campaigns
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Broadcast = require('../models/Broadcast');
const Customer = require('../models/Customer');
const whatsappService = require('../services/whatsapp.service');

// GET /api/broadcast - List all campaigns
router.get('/', protect, async (req, res) => {
  try {
    const broadcasts = await Broadcast.find({ shopId: req.shop._id }).sort({ createdAt: -1 });
    res.json({ success: true, broadcasts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/broadcast - Create campaign
router.post('/', protect, async (req, res) => {
  try {
    const broadcast = await Broadcast.create({ ...req.body, shopId: req.shop._id });
    res.status(201).json({ success: true, message: 'Campaign created!', broadcast });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/broadcast/:id/send - Send campaign now
router.post('/:id/send', protect, async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({ _id: req.params.id, shopId: req.shop._id });
    if (!broadcast) return res.status(404).json({ success: false, message: 'Campaign not found.' });

    // Get target customers
    const customers = await Customer.find({ shopId: req.shop._id, phone: { $exists: true } });

    broadcast.status = 'sending';
    broadcast.totalRecipients = customers.length;
    await broadcast.save();

    // Send WhatsApp to each customer (in background)
    let delivered = 0, failed = 0;
    for (const customer of customers) {
      try {
        await whatsappService.sendMessage(customer.phone, broadcast.message);
        delivered++;
      } catch (e) {
        failed++;
      }
    }

    broadcast.status = 'sent';
    broadcast.delivered = delivered;
    broadcast.failed = failed;
    broadcast.sentAt = new Date();
    await broadcast.save();

    res.json({ success: true, message: `Sent to ${delivered} customers!`, broadcast });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
