// routes/shops.js — stub (implement next)
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/shops — list all live shops (home page grid)
router.get('/', async (req, res) => {
  const db = global.db;
  try {
    const [shops] = await db.query(
      `SELECT s.*, u.name AS seller_name
       FROM shops s
       JOIN users u ON u.id = s.seller_id
       WHERE s.is_active = 1
       ORDER BY s.is_live DESC, s.updated_at DESC`
    );
    res.json({ success: true, shops });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/shops/:id — single shop detail
router.get('/:id', async (req, res) => {
  const db = global.db;
  try {
    const [[shop]] = await db.query(
      `SELECT s.*, u.name AS seller_name
       FROM shops s JOIN users u ON u.id = s.seller_id
       WHERE s.id = ?`, [req.params.id]
    );
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/shops/:id — seller updates their shop
router.put('/:id', authMiddleware, requireRole('seller'), async (req, res) => {
  const { name, description, logo_url, banner_url, category, address, city } = req.body;
  const db = global.db;
  try {
    await db.query(
      `UPDATE shops SET
        name        = COALESCE(?, name),
        description = COALESCE(?, description),
        logo_url    = COALESCE(?, logo_url),
        banner_url  = COALESCE(?, banner_url),
        category    = COALESCE(?, category),
        address     = COALESCE(?, address),
        city        = COALESCE(?, city)
       WHERE id = ? AND seller_id = ?`,
      [name, description, logo_url, banner_url, category, address, city, req.params.id, req.user.id]
    );
    const [[shop]] = await db.query('SELECT * FROM shops WHERE id = ?', [req.params.id]);
    res.json({ success: true, shop });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
