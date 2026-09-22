/**
 * WhatsApp Webhook
 * Meta sends ALL incoming messages here — from all connected shop numbers.
 *
 * How multi-shop routing works:
 *  Each shop connects their own WhatsApp number (phone_number_id).
 *  Meta includes the phone_number_id in every webhook payload.
 *  We look up which shop owns that number → route to the right bot session.
 *
 *  Fallback: if no shop owns the number, use Souqly's shared number
 *  and identify the shop from the session or "order <slug>" message.
 *
 * Meta Webhook URL (set once, handles ALL shop numbers):
 *  https://yes-production-4a9f.up.railway.app/api/webhook/whatsapp
 */

const express = require('express');
const router  = express.Router();
const { handleIncoming } = require('../services/wabot.service');
const { handleOwnerMessage } = require('../services/wabot_owner.service');
const Shop = require('../models/Shop');

// Souqly's own platform phone number ID (for owner bot)
const SOUQLY_PHONE_ID = process.env.META_PHONE_NUMBER_ID;

const VERIFY_TOKEN = process.env.WA_WEBHOOK_TOKEN || 'souqly_webhook_2024';

// ── Webhook verification (GET) ────────────────────────────────────────────────
router.get('/whatsapp', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  res.sendStatus(403);
});

// ── Receive incoming messages (POST) ─────────────────────────────────────────
router.post('/whatsapp', async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.sendStatus(200);

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value;
        if (!value?.messages) continue;

        // Which phone number received this message?
        const receivingPhoneNumberId = value.metadata?.phone_number_id;

        // Find which shop owns this number (if any)
        let shopCreds = null;
        if (receivingPhoneNumberId) {
          const shop = await Shop.findOne({
            'whatsappApi.phoneNumberId': receivingPhoneNumberId,
            'whatsappApi.connected': true
          }).lean();

          if (shop) {
            shopCreds = {
              phoneNumberId: shop.whatsappApi.phoneNumberId,
              accessToken:   shop.whatsappApi.accessToken,
              shopId:        String(shop._id),
              shopSlug:      shop.slug,
              shopName:      shop.name
            };
          }
        }

        for (const message of value.messages) {
          const phone = message.from;
          const type  = message.type;

          let text        = null;
          let interactive = null;

          if (type === 'text') {
            text = message.text?.body;
          } else if (type === 'interactive') {
            const ir = message.interactive;
            if (ir?.type === 'list_reply')   interactive = ir.list_reply?.id;
            if (ir?.type === 'button_reply') interactive = ir.button_reply?.id;
            text = ir?.list_reply?.title || ir?.button_reply?.title || interactive;
          } else if (type === 'button') {
            text = message.button?.text;
          }

          if (!text && !interactive) continue;

          // If message arrived on Souqly's own number (no shopCreds) → Owner Bot
          // If message arrived on a shop's connected number → Customer Bot
          if (!shopCreds && receivingPhoneNumberId === SOUQLY_PHONE_ID) {
            handleOwnerMessage(phone, text).catch(err =>
              console.error('[WA Owner Bot error]', phone, err.message)
            );
          } else {
            handleIncoming(phone, type, text, interactive, shopCreds).catch(err =>
              console.error('[WA Customer Bot error]', phone, err.message)
            );
          }
        }
      }
    }
  } catch (err) {
    console.error('[WA Webhook parse error]', err.message);
  }
});

module.exports = router;
