// ============================================================
// routes/agora.js — Agora RTC Token Generation
// POST /api/agora/token
//
// Required npm package: agora-access-token
// Install: npm install agora-access-token
// ============================================================

const express = require('express');
const {
  RtcTokenBuilder,
  RtcRole,
} = require('agora-access-token');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Token validity: 1 hour (Agora recommends refreshing tokens)
const TOKEN_EXPIRY_SECONDS = 3600;

// ============================================================
// POST /api/agora/token
// Protected — caller must be authenticated
//
// Body: {
//   channelName: string,   -- unique channel (e.g. "live_<shopId>" or "call_<callId>")
//   uid: number,           -- 0 = let Agora assign, or pass user's numeric ID
//   role?: "publisher" | "subscriber"   default: "publisher"
// }
//
// Returns: { token, channelName, uid, expiresAt }
// ============================================================
router.post('/token', authMiddleware, (req, res) => {
  const appId          = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    return res.status(500).json({
      success: false,
      message: 'Agora credentials not configured on server',
    });
  }

  const { channelName, uid = 0, role = 'publisher' } = req.body;

  if (!channelName || typeof channelName !== 'string' || channelName.trim() === '') {
    return res.status(422).json({ success: false, message: 'channelName is required' });
  }

  // Agora UIDs must be 32-bit unsigned integers
  const numericUid = parseInt(uid, 10) || 0;
  if (numericUid < 0 || numericUid > 4294967295) {
    return res.status(422).json({ success: false, message: 'uid must be a 32-bit unsigned integer' });
  }

  const agoraRole = role === 'subscriber' ? RtcRole.SUBSCRIBER : RtcRole.PUBLISHER;

  const currentTimestamp  = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + TOKEN_EXPIRY_SECONDS;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName.trim(),
      numericUid,
      agoraRole,
      privilegeExpiredTs
    );

    return res.json({
      success: true,
      token,
      channelName: channelName.trim(),
      uid: numericUid,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[Agora/token]', err);
    return res.status(500).json({ success: false, message: 'Failed to generate Agora token' });
  }
});

// ============================================================
// POST /api/agora/live-channel
// Convenience: generate a channel name for a live session
// + return token in one call (used by seller "Go Live")
//
// Body: { shopId, uid }
// ============================================================
router.post('/live-channel', authMiddleware, async (req, res) => {
  const appId          = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    return res.status(500).json({ success: false, message: 'Agora credentials not configured' });
  }

  const { shopId, uid = 0 } = req.body;
  if (!shopId) {
    return res.status(422).json({ success: false, message: 'shopId required' });
  }

  // Channel name format: live_<shopId>_<timestamp>
  const channelName = `live_${shopId}_${Date.now()}`;
  const numericUid  = parseInt(uid, 10) || 0;

  const currentTimestamp   = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + TOKEN_EXPIRY_SECONDS;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    // Persist live session in DB
    const db = global.db;
    const [result] = await db.query(
      `INSERT INTO live_sessions (shop_id, seller_id, agora_channel, status)
       VALUES (?, ?, ?, 'live')`,
      [shopId, req.user.id, channelName]
    );

    // Mark shop as live
    await db.query('UPDATE shops SET is_live = 1 WHERE id = ?', [shopId]);

    return res.status(201).json({
      success: true,
      token,
      channelName,
      uid: numericUid,
      liveSessionId: result.insertId,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[Agora/live-channel]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// POST /api/agora/call-channel
// Generate channel for a buyer→seller video call
// Body: { callSessionId, uid }
// ============================================================
router.post('/call-channel', authMiddleware, async (req, res) => {
  const appId          = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;

  if (!appId || !appCertificate) {
    return res.status(500).json({ success: false, message: 'Agora credentials not configured' });
  }

  const { callSessionId, uid = 0 } = req.body;
  if (!callSessionId) {
    return res.status(422).json({ success: false, message: 'callSessionId required' });
  }

  const channelName = `call_${callSessionId}`;
  const numericUid  = parseInt(uid, 10) || 0;

  const currentTimestamp   = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + TOKEN_EXPIRY_SECONDS;

  try {
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      numericUid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    return res.json({
      success: true,
      token,
      channelName,
      uid: numericUid,
      expiresAt: new Date(privilegeExpiredTs * 1000).toISOString(),
    });
  } catch (err) {
    console.error('[Agora/call-channel]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
