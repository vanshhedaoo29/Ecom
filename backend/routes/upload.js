// ============================================================
// routes/upload.js — Image Upload Endpoints
//
// POST /api/upload/product-images   → upload up to 5 product images
// POST /api/upload/shop-logo        → upload shop logo
// POST /api/upload/shop-banner      → upload shop banner
// POST /api/upload/avatar           → upload user avatar
// POST /api/upload/ar-capture       → upload base64 AR garment frame
// DELETE /api/upload/:publicId      → delete an image from Cloudinary
// ============================================================

const express = require('express');
const router  = express.Router();
const { authMiddleware, requireRole } = require('../middleware/auth');
const {
  uploadMultiple,
  uploadSingle,
  handleUploadError,
  uploadBase64,
  deleteImage,
} = require('../middleware/upload');

// ── POST /api/upload/product-images ─────────────────────────
// Seller uploads up to 5 product images at once
// Returns array of Cloudinary URLs
router.post(
  '/product-images',
  authMiddleware,
  requireRole('seller'),
  uploadMultiple('images', 5, 'products'),
  handleUploadError,
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }
    const urls = req.files.map(f => f.path); // Cloudinary secure_url
    res.json({ success: true, urls });
  }
);

// ── POST /api/upload/shop-logo ───────────────────────────────
router.post(
  '/shop-logo',
  authMiddleware,
  requireRole('seller'),
  uploadSingle('logo', 'shops'),
  handleUploadError,
  (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, url: req.file.path });
  }
);

// ── POST /api/upload/shop-banner ─────────────────────────────
router.post(
  '/shop-banner',
  authMiddleware,
  requireRole('seller'),
  uploadSingle('banner', 'shops'),
  handleUploadError,
  (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    res.json({ success: true, url: req.file.path });
  }
);

// ── POST /api/upload/avatar ──────────────────────────────────
router.post(
  '/avatar',
  authMiddleware,
  uploadSingle('avatar', 'avatars'),
  handleUploadError,
  async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = req.file.path;
    // Save avatar URL to user record
    const db = global.db;
    await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
    res.json({ success: true, url });
  }
);

// ── POST /api/upload/ar-capture ──────────────────────────────
// AR engine sends a base64 garment frame captured from seller video
// Body: { image: "data:image/png;base64,..." }
router.post('/ar-capture', authMiddleware, async (req, res) => {
  const { image } = req.body;
  if (!image || !image.startsWith('data:image')) {
    return res.status(422).json({ success: false, message: 'Valid base64 image required' });
  }
  try {
    const { url, publicId } = await uploadBase64(image, 'ar-captures');
    res.json({ success: true, url, publicId });
  } catch (err) {
    console.error('[Upload/ar-capture]', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ── DELETE /api/upload/:publicId ─────────────────────────────
// publicId comes URL-encoded e.g. "ecom%2Fproducts%2Fabc123"
router.delete('/:publicId(*)', authMiddleware, async (req, res) => {
  const publicId = req.params.publicId;
  try {
    await deleteImage(publicId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    console.error('[Upload/delete]', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;
