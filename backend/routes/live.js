// routes/live.js
const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/live — all currently live sessions
router.get('/', async (req, res) => {
  const db = global.db;
  try {
    const [sessions] = await db.query(
      `SELECT
         ls.id, ls.agora_channel, ls.started_at, ls.viewer_count,
         s.id AS shop_id, s.name AS shop_name, s.logo_url, s.category, s.city,
         u.id AS seller_id, u.name AS seller_name, u.avatar_url AS seller_avatar
       FROM live_sessions ls
       JOIN shops s ON s.id = ls.shop_id
       JOIN users u ON u.id = ls.seller_id
       WHERE ls.status = 'live'
       ORDER BY ls.viewer_count DESC, ls.started_at DESC`
    );
    res.json({ success: true, sessions });
  } catch (err) {
    console.error('[Live/list]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/live/:id
router.get('/:id', async (req, res) => {
  const db = global.db;
  try {
    const [[session]] = await db.query(
      `SELECT ls.*, s.name AS shop_name, s.logo_url, s.category,
              u.name AS seller_name, u.avatar_url AS seller_avatar
       FROM live_sessions ls
       JOIN shops s ON s.id = ls.shop_id
       JOIN users u ON u.id = ls.seller_id
       WHERE ls.id = ?`,
      [req.params.id]
    );
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/live/:id/end
router.post('/:id/end', authMiddleware, requireRole('seller'), async (req, res) => {
  const db = global.db;
  try {
    const [[session]] = await db.query(
      'SELECT * FROM live_sessions WHERE id = ? AND seller_id = ?',
      [req.params.id, req.user.id]
    );
    if (!session) return res.status(404).json({ success: false, message: 'Not found' });
    if (session.status === 'ended') return res.status(400).json({ success: false, message: 'Already ended' });

    await db.query(`UPDATE live_sessions SET status='ended', ended_at=NOW() WHERE id=?`, [req.params.id]);
    await db.query('UPDATE shops SET is_live = 0 WHERE id = ?', [session.shop_id]);

    const io = req.app.get('io');
    if (io) io.to(`live_${req.params.id}`).emit('live_ended', { liveSessionId: req.params.id });

    res.json({ success: true, message: 'Live session ended' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PATCH /api/live/:id/viewers
router.patch('/:id/viewers', async (req, res) => {
  const { action } = req.body;
  if (!['join', 'leave'].includes(action)) {
    return res.status(422).json({ success: false, message: 'action must be join or leave' });
  }
  const db = global.db;
  try {
    if (action === 'join') {
      await db.query('UPDATE live_sessions SET viewer_count = viewer_count + 1 WHERE id = ?', [req.params.id]);
    } else {
      await db.query('UPDATE live_sessions SET viewer_count = GREATEST(viewer_count - 1, 0) WHERE id = ?', [req.params.id]);
    }
    const [[s]] = await db.query('SELECT viewer_count FROM live_sessions WHERE id = ?', [req.params.id]);
    res.json({ success: true, viewer_count: s?.viewer_count ?? 0 });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;