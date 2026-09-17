// Firebase Admin SDK setup - used to send push notifications to owner app
const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;

  const { FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL } = process.env;

  // Skip silently if not configured yet (so app keeps running without Firebase)
  if (!FIREBASE_PROJECT_ID || FIREBASE_PROJECT_ID === 'your_firebase_project_id') {
    console.log('⚠️  Firebase not configured — push notifications disabled');
    return null;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        // .env stores \n as literal characters — convert back to real newlines
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    });
    initialized = true;
    console.log('🔥 Firebase Admin initialized — push notifications ready');
    return admin;
  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
    return null;
  }
}

module.exports = initFirebase;
