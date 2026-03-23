// ============================================================
// routes/upload.js — Image Upload Endpoints
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
  cloudinary,
} = require('../middleware/upload');
const multer             = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// ── AR capture specific Cloudinary storage ───────────────────
const arStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'ar-captures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation:  [{ quality: 'auto', fetch_format: 'auto' }],
  },
});
const arUploader = multer({
  storage: arStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
});

// ── POST /api/upload/product-images ─────────────────────────
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
    const urls = req.files.map(f => f.path);
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
    const db = global.db;
    await db.query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
    res.json({ success: true, url });
  }
);

// ── POST /api/upload/ar-capture ──────────────────────────────
// Accepts BOTH:
//   1. multipart/form-data — field name: "image" (file upload)
//   2. JSON body           — { image: "data:image/png;base64,..." }
// Returns: { success, imageUrl }
router.post(
  '/ar-capture',
  authMiddleware,
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      return arUploader.single('image')(req, res, next);
    }
    next();
  },
  async (req, res) => {
    try {
      // Case 1 — file uploaded via multipart
      if (req.file) {
        return res.json({ success: true, imageUrl: req.file.path });
      }
      // Case 2 — base64 string in JSON body
      const { image } = req.body;
      if (!image || !image.startsWith('data:image')) {
        return res.status(422).json({ success: false, message: 'Valid image file or base64 required' });
      }
      const { url } = await uploadBase64(image, 'ar-captures');
      return res.json({ success: true, imageUrl: url });
    } catch (err) {
      console.error('[Upload/ar-capture]', err);
      res.status(500).json({ success: false, message: 'Upload failed' });
    }
  }
);

// ── DELETE /api/upload/:publicId ─────────────────────────────
router.delete('/:publicId(*)', authMiddleware, async (req, res) => {
  try {
    await deleteImage(req.params.publicId);
    res.json({ success: true, message: 'Image deleted' });
  } catch (err) {
    console.error('[Upload/delete]', err);
    res.status(500).json({ success: false, message: 'Delete failed' });
  }
});

module.exports = router;