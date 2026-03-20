// routes/calls.js
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');

// POST /api/calls — buyer initiates a call request
router.post('/', authMiddleware, async (req, res) => {
  const { seller_id, shop_id } = req.body;
  const db = global.db;
  try {
    const channelName = `call_${Date.now()}_${req.user.id}`;
    const [r] = await db.query(
      `INSERT INTO call_sessions (buyer_id, seller_id, shop_id, agora_channel, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [req.user.id, seller_id, shop_id, channelName]
    );
    res.status(201).json({ success: true, callSessionId: r.insertId, channelName });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PATCH /api/calls/:id/accept
router.patch('/:id/accept', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    await db.query(
      `UPDATE call_sessions SET status='accepted', accepted_at=NOW() WHERE id=?`,
      [req.params.id]
    );
    const [[call]] = await db.query('SELECT * FROM call_sessions WHERE id=?', [req.params.id]);
    res.json({ success: true, call });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PATCH /api/calls/:id/reject
router.patch('/:id/reject', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    await db.query(`UPDATE call_sessions SET status='rejected' WHERE id=?`, [req.params.id]);
    res.json({ success: true, message: 'Call rejected' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PATCH /api/calls/:id/end
router.patch('/:id/end', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    await db.query(`UPDATE call_sessions SET status='ended', ended_at=NOW() WHERE id=?`, [req.params.id]);
    res.json({ success: true, message: 'Call ended' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
