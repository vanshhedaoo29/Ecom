// ============================================================
// utils/fcm.js — Firebase Cloud Messaging (FCM) Push Notifications
// Used to send push alerts to the seller's Android app
//
// Install: npm install firebase-admin
// Add your Firebase service account JSON to backend/config/firebase-service-account.json
// ============================================================

const admin = require('firebase-admin');
const path  = require('path');

// ── Initialize Firebase Admin once ───────────────────────────
let firebaseApp;

function getFirebaseApp() {
  if (firebaseApp) return firebaseApp;

  const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');

  try {
    const serviceAccount = require(serviceAccountPath);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✅  Firebase Admin initialized');
  } catch (err) {
    // Fallback: use FIREBASE_SERVER_KEY env if service account file not found
    console.warn('⚠️   firebase-service-account.json not found. Using env fallback.');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  return firebaseApp;
}

// ── Core send function ───────────────────────────────────────
/**
 * Send a push notification to a single device.
 * @param {string} fcmToken  - Device FCM registration token
 * @param {string} title     - Notification title
 * @param {string} body      - Notification body text
 * @param {object} data      - Extra key-value payload (all values must be strings)
 * @returns {Promise<string>} - FCM message ID on success
 */
async function sendPush(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.warn('[FCM] sendPush called with no fcmToken — skipping');
    return null;
  }

  // Ensure all data values are strings (FCM requirement)
  const stringData = {};
  for (const [k, v] of Object.entries(data)) {
    stringData[k] = String(v);
  }

  const message = {
    token: fcmToken,
    notification: { title, body },
    data: stringData,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channel_id: 'ecom_calls', // register this channel in the Android app
      },
    },
  };

  try {
    getFirebaseApp(); // ensure initialized
    const messageId = await admin.messaging().send(message);
    console.log(`[FCM] Push sent → ${messageId}`);
    return messageId;
  } catch (err) {
    console.error('[FCM] Failed to send push:', err.message);
    throw err;
  }
}

// ============================================================
// Specific notification helpers — call these from your routes
// ============================================================

/**
 * Notify seller of an incoming video call from a buyer.
 * @param {string} sellerFcmToken
 * @param {object} payload - { callSessionId, buyerName, shopId }
 */
async function notifyIncomingCall(sellerFcmToken, { callSessionId, buyerName, shopId }) {
  return sendPush(
    sellerFcmToken,
    '📞 Incoming Call',
    `${buyerName} wants to talk to you!`,
    {
      type:          'incoming_call',
      callSessionId: String(callSessionId),
      buyerName:     buyerName,
      shopId:        String(shopId),
    }
  );
}

/**
 * Notify buyer that their call was accepted.
 * @param {string} buyerFcmToken
 * @param {object} payload - { callSessionId, agoraChannel, sellerName }
 */
async function notifyCallAccepted(buyerFcmToken, { callSessionId, agoraChannel, sellerName }) {
  return sendPush(
    buyerFcmToken,
    '✅ Call Accepted',
    `${sellerName} accepted your call. Connecting now...`,
    {
      type:          'call_accepted',
      callSessionId: String(callSessionId),
      agoraChannel:  agoraChannel,
    }
  );
}

/**
 * Notify buyer that their call was rejected.
 * @param {string} buyerFcmToken
 * @param {object} payload - { callSessionId, sellerName }
 */
async function notifyCallRejected(buyerFcmToken, { callSessionId, sellerName }) {
  return sendPush(
    buyerFcmToken,
    '❌ Call Rejected',
    `${sellerName} is unavailable right now.`,
    {
      type:          'call_rejected',
      callSessionId: String(callSessionId),
    }
  );
}

/**
 * Notify seller of a new order placed in their shop.
 * @param {string} sellerFcmToken
 * @param {object} payload - { orderId, buyerName, totalAmount }
 */
async function notifyNewOrder(sellerFcmToken, { orderId, buyerName, totalAmount }) {
  return sendPush(
    sellerFcmToken,
    '🛒 New Order Received',
    `${buyerName} placed an order worth ₹${totalAmount}`,
    {
      type:        'new_order',
      orderId:     String(orderId),
      buyerName:   buyerName,
      totalAmount: String(totalAmount),
    }
  );
}

/**
 * Notify buyer about their order status update.
 * @param {string} buyerFcmToken
 * @param {object} payload - { orderId, status }
 */
async function notifyOrderStatus(buyerFcmToken, { orderId, status }) {
  const statusMessages = {
    confirmed: 'Your order has been confirmed! 🎉',
    shipped:   'Your order is on the way! 🚚',
    delivered: 'Your order has been delivered! 📦',
    cancelled: 'Your order has been cancelled.',
  };
  return sendPush(
    buyerFcmToken,
    '📦 Order Update',
    statusMessages[status] || `Order status: ${status}`,
    {
      type:    'order_status',
      orderId: String(orderId),
      status:  status,
    }
  );
}

module.exports = {
  sendPush,
  notifyIncomingCall,
  notifyCallAccepted,
  notifyCallRejected,
  notifyNewOrder,
  notifyOrderStatus,
};
