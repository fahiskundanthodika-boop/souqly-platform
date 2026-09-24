// PhonePe Payment Gateway Service
// Docs: https://developer.phonepe.com/v1/reference/pay-api-1
const axios = require('axios');
const crypto = require('crypto');

const ENV       = process.env.PHONEPE_ENV || 'SANDBOX';
const CLIENT_ID = process.env.PHONEPE_CLIENT_ID;
const CLIENT_SECRET = process.env.PHONEPE_CLIENT_SECRET;
const CLIENT_VERSION = process.env.PHONEPE_CLIENT_VERSION || '1';
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;

const BASE_URL = ENV === 'PRODUCTION'
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Get OAuth access token
async function getAccessToken() {
  const res = await axios.post(`${BASE_URL}/v1/oauth/token`, {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    client_version: CLIENT_VERSION,
    grant_type: 'client_credentials'
  });
  return res.data.access_token;
}

// Initiate a payment
async function initiatePayment({ orderId, amount, customerPhone, redirectUrl, callbackUrl }) {
  const token = await getAccessToken();

  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId: String(orderId),
    amount: Math.round(amount * 100), // paise
    redirectUrl,
    redirectMode: 'REDIRECT',
    callbackUrl,
    mobileNumber: customerPhone,
    paymentInstrument: { type: 'PAY_PAGE' }
  };

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const checksum = sha256(encoded + '/pg/v1/pay' + CLIENT_SECRET) + '###1';

  const res = await axios.post(`${BASE_URL}/pg/v1/pay`, { request: encoded }, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      Authorization: `O-Bearer ${token}`
    }
  });

  return res.data;
}

// Verify payment status
async function checkStatus(merchantTransactionId) {
  const token = await getAccessToken();
  const path = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  const checksum = sha256(path + CLIENT_SECRET) + '###1';

  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': checksum,
      'X-MERCHANT-ID': MERCHANT_ID,
      Authorization: `O-Bearer ${token}`
    }
  });

  return res.data;
}

module.exports = { initiatePayment, checkStatus };
