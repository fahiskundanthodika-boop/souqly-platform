// Send WhatsApp status update messages when order status changes
const axios = require('axios');

const BASE_URL = 'https://graph.facebook.com/v18.0';

async function sendStatusUpdate(order, shop) {
  const phone = order.customerPhone;
  if (!phone) return;

  const phoneNumberId = shop?.whatsappApi?.phoneNumberId || process.env.META_PHONE_NUMBER_ID;
  const token         = shop?.whatsappApi?.accessToken   || process.env.META_ACCESS_TOKEN;
  if (!phoneNumberId || !token) return;

  const normalized = normalisePhone(phone);
  const orderId    = `#${order.orderId}`;
  const shopName   = shop.name;

  const messages = {
    confirmed: `👍 *Order ${orderId} Confirmed!*\n\nWe've received your order and are preparing it now.\n\n— ${shopName}`,
    packing:   `📦 *Your order is being packed!*\n\nOrder ${orderId} is almost ready for delivery.\n\n— ${shopName}`,
    out_for_delivery: `🛵 *Your order is on the way!*\n\nOrder ${orderId} has been picked up by our rider.\nEstimated arrival: 20–30 mins 🕐\n\n— ${shopName}`,
    delivered: `✅ *Order Delivered!*\n\nOrder ${orderId} has been delivered. Thank you for ordering from *${shopName}* 😊\n\nHow was your experience? Reply with a rating:\n⭐ 1  ⭐⭐ 2  ⭐⭐⭐ 3  ⭐⭐⭐⭐ 4  ⭐⭐⭐⭐⭐ 5`,
    cancelled: `❌ *Order Cancelled*\n\nSorry, order ${orderId} has been cancelled.\nFor assistance, please contact ${shopName} directly.\n\nWe apologise for the inconvenience.`,
  };

  const messageBody = messages[order.orderStatus];
  if (!messageBody) return;

  try {
    await axios.post(
      `${BASE_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: normalized,
        type: 'text',
        text: { body: messageBody },
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log(`📱 Status update sent to ${normalized} for order ${orderId}`);
  } catch (err) {
    console.error('❌ Status update WA send failed:', err?.response?.data || err.message);
  }
}

function normalisePhone(phone) {
  let p = String(phone).replace(/\D/g, '');
  if (p.length === 10) p = '91' + p;
  return p;
}

module.exports = { sendStatusUpdate };
