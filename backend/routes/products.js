// routes/products.js
const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');

// GET /api/products?shopId=x
router.get('/', async (req, res) => {
  const db = global.db;
  const { shopId } = req.query;
  try {
    let q = 'SELECT * FROM products WHERE is_active = 1';
    const params = [];
    if (shopId) { q += ' AND shop_id = ?'; params.push(shopId); }
    const [products] = await db.query(q, params);
    res.json({ success: true, products });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const db = global.db;
  try {
    const [[product]] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// POST /api/products
router.post('/', authMiddleware, requireRole('seller'), async (req, res) => {
  const { shop_id, name, description, price, stock_qty, category,
          garment_width_cm, garment_height_cm, sizes_available, image_urls } = req.body;
  const db = global.db;
  try {
    const [r] = await db.query(
      `INSERT INTO products (shop_id, name, description, price, stock_qty, category,
        garment_width_cm, garment_height_cm, sizes_available, image_urls)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [shop_id, name, description, price, stock_qty, category,
       garment_width_cm, garment_height_cm, sizes_available, JSON.stringify(image_urls || [])]
    );
    const [[product]] = await db.query('SELECT * FROM products WHERE id = ?', [r.insertId]);
    res.status(201).json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// PUT /api/products/:id
router.put('/:id', authMiddleware, requireRole('seller'), async (req, res) => {
  const { name, description, price, stock_qty, category,
          garment_width_cm, garment_height_cm, sizes_available, image_urls } = req.body;
  const db = global.db;
  try {
    await db.query(
      `UPDATE products SET
        name=COALESCE(?,name), description=COALESCE(?,description),
        price=COALESCE(?,price), stock_qty=COALESCE(?,stock_qty),
        category=COALESCE(?,category), garment_width_cm=COALESCE(?,garment_width_cm),
        garment_height_cm=COALESCE(?,garment_height_cm),
        sizes_available=COALESCE(?,sizes_available),
        image_urls=COALESCE(?,image_urls)
       WHERE id=?`,
      [name, description, price, stock_qty, category,
       garment_width_cm, garment_height_cm, sizes_available,
       image_urls ? JSON.stringify(image_urls) : null, req.params.id]
    );
    const [[product]] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, product });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// DELETE /api/products/:id (soft delete)
router.delete('/:id', authMiddleware, requireRole('seller'), async (req, res) => {
  const db = global.db;
  try {
    await db.query('UPDATE products SET is_active = 0 WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Product removed' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

module.exports = router;
