// routes/cart.js
const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');

// GET /api/cart
router.get('/', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    const [items] = await db.query(
      `SELECT ci.*, p.name, p.price, p.image_urls
       FROM cart_items ci JOIN products p ON p.id = ci.product_id
       WHERE ci.buyer_id = ?`,
      [req.user.id]
    );
    const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    res.json({ success: true, items, total: parseFloat(total.toFixed(2)) });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/cart — add item
router.post('/', authMiddleware, async (req, res) => {
  const { product_id, quantity = 1, size } = req.body;
  const db = global.db;
  try {
    await db.query(
      `INSERT INTO cart_items (buyer_id, product_id, quantity, size)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
      [req.user.id, product_id, quantity, size || null]
    );
    res.status(201).json({ success: true, message: 'Added to cart' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/cart/:id — update quantity
router.put('/:id', authMiddleware, async (req, res) => {
  const { quantity } = req.body;
  const db = global.db;
  try {
    await db.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND buyer_id = ?',
      [quantity, req.params.id, req.user.id]
    );
    res.json({ success: true, message: 'Cart updated' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// DELETE /api/cart/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    await db.query('DELETE FROM cart_items WHERE id = ? AND buyer_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true, message: 'Item removed' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// DELETE /api/cart — clear entire cart
router.delete('/', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    await db.query('DELETE FROM cart_items WHERE buyer_id = ?', [req.user.id]);
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
