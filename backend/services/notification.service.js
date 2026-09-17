// Notification service - Firebase push notifications for mobile apps
let admin;

const initFirebase = () => {
  if (!admin && process.env.FIREBASE_PROJECT_ID) {
    admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    });
  }
  return admin;
};

// Send push notification to a device using its FCM token
const sendPushNotification = async (fcmToken, title, body, data = {}) => {
  try {
    const firebaseAdmin = initFirebase();
    if (!firebaseAdmin) {
      console.log('Firebase not configured, skipping push notification');
      return;
    }

    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      android: { priority: 'high', notification: { sound: 'default', channelId: 'orders' } },
      apns: { payload: { aps: { sound: 'default', badge: 1 } } }
    };

    const result = await firebaseAdmin.messaging().send(message);
    console.log('✅ Push notification sent:', result);
    return result;
  } catch (err) {
    console.error('Push notification error:', err.message);
  }
};

// Notify rider about a new delivery assignment
const notifyRider = async (rider, order) => {
  if (!rider.fcmToken) return;
  return sendPushNotification(
    rider.fcmToken,
    '🛵 New Delivery!',
    `Order #${order.orderId} - ${order.customerName} - ₹${order.total}`,
    { orderId: String(order._id), type: 'new_delivery' }
  );
};

// Notify shop owner about a new order
const notifyOwner = async (shop, order) => {
  if (!shop.fcmToken) return;
  return sendPushNotification(
    shop.fcmToken,
    'New Order!',
    `#${order.orderId} — ${order.customerName} — Rs.${order.total}`,
    { orderId: String(order._id), type: 'new_order', screen: 'Orders' }
  );
};

module.exports = { sendPushNotification, notifyRider, notifyOwner };
