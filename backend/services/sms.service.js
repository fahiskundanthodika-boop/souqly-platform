// ── MSG91 SMS Service ─────────────────────────────────────────────
// Uses MSG91's Flow API (template-based SMS)
// Docs: https://docs.msg91.com/reference/send-sms

const https = require('https');

const AUTHKEY   = process.env.MSG91_AUTH_KEY || '';
const SENDER_ID = process.env.MSG91_SENDER_ID || 'SOUQLY';

// MSG91 template IDs — create these in your MSG91 account and paste IDs here
// Each template has variables that match what we send below
const TEMPLATE = {
  ORDER_PLACED:  process.env.MSG91_TPL_ORDER_PLACED  || '',
  ORDER_CONFIRM: process.env.MSG91_TPL_ORDER_CONFIRM || '',
  ORDER_PACKED:  process.env.MSG91_TPL_ORDER_PACKED  || '',
  OUT_DELIVERY:  process.env.MSG91_TPL_OUT_DELIVERY  || '',
  DELIVERED:     process.env.MSG91_TPL_DELIVERED     || '',
  CANCELLED:     process.env.MSG91_TPL_CANCELLED     || '',
  OTP:           process.env.MSG91_TPL_OTP           || '',
};

// Returns true if SMS is configured
function isSmsEnabled() {
  return Boolean(AUTHKEY && AUTHKEY !== 'your_msg91_auth_key');
}

// Low-level MSG91 Flow API call
function sendFlow(mobileNumber, templateId, variables = {}) {
  return new Promise((resolve, reject) => {
    if (!isSmsEnabled()) return resolve({ skipped: 'MSG91 not configured' });
    if (!templateId) return resolve({ skipped: 'Template ID not set' });

    // Normalise: strip leading + or 0, ensure 91 country code for India
    let mobile = String(mobileNumber).replace(/\D/g, '');
    if (mobile.length === 10) mobile = '91' + mobile;

    const payload = JSON.stringify({
      flow_id:   templateId,
      sender:    SENDER_ID,
      mobiles:   mobile,
      ...variables       // e.g. { var1: 'value', var2: 'value' }
    });

    const options = {
      hostname: 'api.msg91.com',
      path:     '/api/v5/flow',
      method:   'POST',
      headers:  {
        'authkey':      AUTHKEY,
        'Content-Type': 'application/json',
        'accept':       'application/json'
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ── Public helpers ────────────────────────────────────────────────

// Sent to customer when they place an order
async function sendOrderPlacedSMS(phone, order, shopName) {
  return sendFlow(phone, TEMPLATE.ORDER_PLACED, {
    var1: order.orderId,       // e.g. "1001"
    var2: shopName,            // e.g. "FaizCart"
    var3: String(order.total), // e.g. "250"
    var4: `http://souqly.in/track/${order._id}` // tracking link
  });
}

// Sent to customer when owner confirms the order
async function sendOrderConfirmedSMS(phone, order, shopName) {
  return sendFlow(phone, TEMPLATE.ORDER_CONFIRM, {
    var1: order.orderId,
    var2: shopName
  });
}

// Sent to customer when status changes
async function sendStatusUpdateSMS(phone, order, newStatus, shopName) {
  const templateMap = {
    packing:          TEMPLATE.ORDER_PACKED,
    out_for_delivery: TEMPLATE.OUT_DELIVERY,
    delivered:        TEMPLATE.DELIVERED,
    cancelled:        TEMPLATE.CANCELLED,
    confirmed:        TEMPLATE.ORDER_CONFIRM,
  };

  const templateId = templateMap[newStatus];
  if (!templateId) return { skipped: 'No template for this status' };

  return sendFlow(phone, templateId, {
    var1: order.orderId,
    var2: shopName,
    var3: `http://souqly.in/track/${order._id}`
  });
}

// OTP SMS for customer login
async function sendOtpSMS(phone, otp) {
  return sendFlow(phone, TEMPLATE.OTP, {
    var1: otp,  // MSG91 OTP templates usually use ##OTP## or var1
    otp:  otp
  });
}

module.exports = {
  isSmsEnabled,
  sendOrderPlacedSMS,
  sendOrderConfirmedSMS,
  sendStatusUpdateSMS,
  sendOtpSMS
};
