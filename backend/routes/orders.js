// routes/orders.js
const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/orders — buyer's order history
router.get('/', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    const [orders] = await db.query(
      `SELECT o.*, s.name AS shop_name
       FROM orders o JOIN shops s ON s.id = o.shop_id
       WHERE o.buyer_id = ?
       ORDER BY o.placed_at DESC`,
      [req.user.id]
    );
    // Attach order items
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, p.name FROM order_items oi JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/orders/seller — seller's incoming orders
router.get('/seller', authMiddleware, requireRole('seller'), async (req, res) => {
  const db = global.db;
  try {
    const [[shop]] = await db.query('SELECT id FROM shops WHERE seller_id = ?', [req.user.id]);
    if (!shop) return res.status(404).json({ success: false, message: 'Shop not found' });
    const [orders] = await db.query(
      `SELECT o.*, u.name AS buyer_name, u.phone AS buyer_phone
       FROM orders o JOIN users u ON u.id = o.buyer_id
       WHERE o.shop_id = ?
       ORDER BY o.placed_at DESC`,
      [shop.id]
    );
    res.json({ success: true, orders });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/orders — checkout: create order from cart
router.post('/', authMiddleware, async (req, res) => {
  const { shop_id, shipping_address } = req.body;
  const db = global.db;
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Get cart items
    const [cartItems] = await conn.query(
      `SELECT ci.*, p.price, p.stock_qty FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.buyer_id = ? AND p.shop_id = ?`,
      [req.user.id, shop_id]
    );
    if (cartItems.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'Cart is empty for this shop' });
    }

    const total = cartItems.reduce((s, i) => s + (i.price * i.quantity), 0);

    // Create order
    const [orderResult] = await conn.query(
      `INSERT INTO orders (buyer_id, shop_id, total_amount, shipping_address)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, shop_id, total.toFixed(2), shipping_address || null]
    );
    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of cartItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, size, unit_price) VALUES (?,?,?,?,?)',
        [orderId, item.product_id, item.quantity, item.size, item.price]
      );
      // Deduct stock
      await conn.query(
        'UPDATE products SET stock_qty = stock_qty - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Clear cart for this shop
    await conn.query(
      `DELETE ci FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.buyer_id = ? AND p.shop_id = ?`,
      [req.user.id, shop_id]
    );

    await conn.commit();
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    res.status(201).json({ success: true, order });
  } catch (err) {
    await conn.rollback();
    console.error('[Orders/post]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    conn.release();
  }
});

// PATCH /api/orders/:id/status — seller updates order status
router.patch('/:id/status', authMiddleware, requireRole('seller'), async (req, res) => {
  const { status } = req.body;
  const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) {
    return res.status(422).json({ success: false, message: 'Invalid status' });
  }
  const db = global.db;
  try {
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true, message: `Order ${status}` });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
