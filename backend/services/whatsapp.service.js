// WhatsApp service - sends messages via Meta WhatsApp Business API
const axios = require('axios');

const BASE_URL = `https://graph.facebook.com/v18.0`;
const PHONE_ID = process.env.META_PHONE_NUMBER_ID;
const TOKEN    = process.env.META_ACCESS_TOKEN;

// Template names — create these in Meta → WhatsApp → Manage → Message Templates
// After approval, update these values in your .env or here directly
const TEMPLATES = {
  ORDER_PLACED:   process.env.WA_TPL_ORDER_PLACED   || 'order_confirmation',
  ORDER_CONFIRM:  process.env.WA_TPL_ORDER_CONFIRM  || 'order_confirmed',
  ORDER_PACKED:   process.env.WA_TPL_ORDER_PACKED   || 'order_packing',
  OUT_DELIVERY:   process.env.WA_TPL_OUT_DELIVERY   || 'out_for_delivery',
  DELIVERED:      process.env.WA_TPL_DELIVERED      || 'order_delivered',
  CANCELLED:      process.env.WA_TPL_CANCELLED      || 'order_cancelled',
};

// Normalise phone: strip non-digits, add 91 for Indian numbers
function normalisePhone(phone) {
  let p = String(phone).replace(/\D/g, '');
  if (p.length === 10) p = '91' + p;
  return p;
}

// ── Core: send a template message ────────────────────────────────
// variables = array of text strings matching {{1}}, {{2}}, ... in your template body
async function sendTemplate(to, templateName, variables = [], lang = 'en') {
  const phone = normalisePhone(to);

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: lang },
    }
  };

  // Only add components if there are variables
  if (variables.length > 0) {
    body.template.components = [
      {
        type: 'body',
        parameters: variables.map(v => ({ type: 'text', text: String(v) }))
      }
    ];
  }

  const res = await axios.post(
    `${BASE_URL}/${PHONE_ID}/messages`,
    body,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return res.data;
}

// ── Fallback: plain text (only works within 24h of customer message) ──
async function sendMessage(to, message) {
  const phone = normalisePhone(to);
  const res = await axios.post(
    `${BASE_URL}/${PHONE_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: phone,
      type: 'text',
      text: { body: message }
    },
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return res.data;
}

// ── Order notifications ───────────────────────────────────────────

// Sent when customer places order
// Template body example: "Order #{{1}} placed at {{2}}! Total: ₹{{3}}. Track: {{4}}"
async function sendOrderConfirmation(customerPhone, order, shopName) {
  return sendTemplate(customerPhone, TEMPLATES.ORDER_PLACED, [
    order.orderId,
    shopName,
    order.total,
    `https://souqly.in/track/${order._id}`
  ]).catch(err => console.error('WA order_placed error:', err.response?.data || err.message));
}

// Sent when owner updates order status
async function sendStatusUpdate(customerPhone, orderId, status, shopName) {
  const templateMap = {
    confirmed:        TEMPLATES.ORDER_CONFIRM,
    packing:          TEMPLATES.ORDER_PACKED,
    out_for_delivery: TEMPLATES.OUT_DELIVERY,
    delivered:        TEMPLATES.DELIVERED,
    cancelled:        TEMPLATES.CANCELLED,
  };

  const templateName = templateMap[status];
  if (!templateName) return;

  // Variables: {{1}} = order ID, {{2}} = shop name
  return sendTemplate(customerPhone, templateName, [orderId, shopName])
    .catch(err => console.error(`WA ${status} error:`, err.response?.data || err.message));
}

module.exports = { sendMessage, sendTemplate, sendOrderConfirmation, sendStatusUpdate };
