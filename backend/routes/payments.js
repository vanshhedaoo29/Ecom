// routes/payments.js — Razorpay integration
const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const Razorpay = require('razorpay');
const { authMiddleware } = require('../middleware/auth');

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// POST /api/payments/create-order
// Creates a Razorpay order for a given DB order
// Body: { orderId }
router.post('/create-order', authMiddleware, async (req, res) => {
  const { orderId } = req.body;
  const db = global.db;
  try {
    const [[order]] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND buyer_id = ?',
      [orderId, req.user.id]
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Order already paid' });
    }

    const rzp = getRazorpay();
    const rzpOrder = await rzp.orders.create({
      amount:   Math.round(order.total_amount * 100), // paise
      currency: 'INR',
      receipt:  `receipt_order_${orderId}`,
    });

    // Save Razorpay order ID
    await db.query('UPDATE orders SET razorpay_order_id = ? WHERE id = ?', [rzpOrder.id, orderId]);

    // Create payment record
    await db.query(
      `INSERT INTO payments (order_id, buyer_id, razorpay_order_id, amount, currency, status)
       VALUES (?, ?, ?, ?, 'INR', 'created')`,
      [orderId, req.user.id, rzpOrder.id, order.total_amount]
    );

    res.json({
      success: true,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('[Payments/create-order]', err);
    res.status(500).json({ success: false, message: 'Failed to create payment order' });
  }
});

// POST /api/payments/verify
// Called after Razorpay checkout succeeds on frontend
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }
router.post('/verify', authMiddleware, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
  const db = global.db;

  // Signature verification
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Payment signature mismatch' });
  }

  try {
    // Update payment record
    await db.query(
      `UPDATE payments
       SET razorpay_payment_id=?, razorpay_signature=?, status='captured', paid_at=NOW()
       WHERE razorpay_order_id=?`,
      [razorpay_payment_id, razorpay_signature, razorpay_order_id]
    );

    // Mark order as paid + confirmed
    await db.query(
      `UPDATE orders SET payment_status='paid', status='confirmed' WHERE id=?`,
      [orderId]
    );

    res.json({ success: true, message: 'Payment verified and order confirmed' });
  } catch (err) {
    console.error('[Payments/verify]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/payments/webhook — Razorpay webhook (optional, for server-side confirmation)
// Set this URL in Razorpay dashboard: https://yourdomain.com/api/payments/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(200).json({ received: true });

  const signature = req.headers['x-razorpay-signature'];
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(req.body)
    .digest('hex');

  if (signature !== expectedSig) {
    return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
  }

  const event = JSON.parse(req.body);
  console.log('[Razorpay Webhook]', event.event);
  // Handle event.event === 'payment.captured', 'payment.failed', etc. here
  res.status(200).json({ received: true });
});

module.exports = router;
