// ============================================================
// routes/auth.js — Register, Login, Profile
// POST /api/auth/register
// POST /api/auth/login
// GET  /api/auth/me
// PUT  /api/auth/fcm-token  (seller saves Firebase token)
// ============================================================

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Helper: sign JWT ──────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── Helper: safe user object (no password) ────────────────
function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ============================================================
// POST /api/auth/register
// Body: { name, email, password, role?, phone? }
// ============================================================
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 characters'),
    body('role').optional().isIn(['buyer', 'seller']).withMessage('Role must be buyer or seller'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role = 'buyer', phone } = req.body;
    const db = global.db;

    try {
      // Check duplicate email
      const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 12);

      // Insert user
      const [result] = await db.query(
        'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, password_hash, role, phone || null]
      );

      const userId = result.insertId;

      // If seller, auto-create a stub shop
      if (role === 'seller') {
        await db.query(
          'INSERT INTO shops (seller_id, name) VALUES (?, ?)',
          [userId, `${name}'s Shop`]
        );
      }

      // Fetch created user
      const [[user]] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      const token = signToken(user);

      return res.status(201).json({
        success: true,
        message: 'Registered successfully',
        token,
        user: safeUser(user),
      });
    } catch (err) {
      console.error('[Auth/register]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ============================================================
// POST /api/auth/login
// Body: { email, password }
// ============================================================
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = global.db;

    try {
      const [[user]] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Account disabled' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = signToken(user);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: safeUser(user),
      });
    } catch (err) {
      console.error('[Auth/login]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ============================================================
// GET /api/auth/me  — get current user's profile
// ============================================================
router.get('/me', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    const [[user]] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // If seller, also return their shop
    let shop = null;
    if (user.role === 'seller') {
      const [[s]] = await db.query('SELECT * FROM shops WHERE seller_id = ?', [user.id]);
      shop = s || null;
    }

    return res.json({ success: true, user: safeUser(user), shop });
  } catch (err) {
    console.error('[Auth/me]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// PUT /api/auth/fcm-token — seller saves Firebase push token
// Body: { fcmToken }
// ============================================================
router.put('/fcm-token', authMiddleware, async (req, res) => {
  const { fcmToken } = req.body;
  if (!fcmToken) {
    return res.status(422).json({ success: false, message: 'fcmToken required' });
  }
  const db = global.db;
  try {
    await db.query('UPDATE users SET fcm_token = ? WHERE id = ?', [fcmToken, req.user.id]);
    return res.json({ success: true, message: 'FCM token saved' });
  } catch (err) {
    console.error('[Auth/fcm-token]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================
// PUT /api/auth/profile — update name, phone, avatar
// Body: { name?, phone?, avatar_url? }
// ============================================================
router.put('/profile', authMiddleware, async (req, res) => {
  const { name, phone, avatar_url } = req.body;
  const db = global.db;
  try {
    await db.query(
      'UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone), avatar_url = COALESCE(?, avatar_url) WHERE id = ?',
      [name || null, phone || null, avatar_url || null, req.user.id]
    );
    const [[user]] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error('[Auth/profile]', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
