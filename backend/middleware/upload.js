// ============================================================
// middleware/upload.js — Cloudinary Image Upload via Multer
//
// Install: npm install multer cloudinary multer-storage-cloudinary
//
// Usage in any route:
//   const { uploadSingle, uploadMultiple } = require('../middleware/upload');
//
//   router.post('/upload', auth, uploadSingle('image'), (req, res) => {
//     res.json({ url: req.file.path });
//   });
//
//   router.post('/upload-many', auth, uploadMultiple('images', 5), (req, res) => {
//     const urls = req.files.map(f => f.path);
//     res.json({ urls });
//   });
// ============================================================

const multer                   = require('multer');
const cloudinary               = require('cloudinary').v2;
const { CloudinaryStorage }    = require('multer-storage-cloudinary');

// ── Configure Cloudinary ─────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Allowed MIME types ───────────────────────────────────────
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_FILE_SIZE   = 5 * 1024 * 1024; // 5 MB

// ── Generic Cloudinary storage factory ──────────────────────
function makeStorage(folder) {
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder:         `ecom/${folder}`,
      allowed_formats: ALLOWED_FORMATS,
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    },
  });
}

// ── File filter — reject non-images ─────────────────────────
function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed (jpg, png, webp)'), false);
  }
  cb(null, true);
}

// ============================================================
// Pre-built upload instances for each use case
// ============================================================

// Product images (up to 5 per request)
const productUploader = multer({
  storage:  makeStorage('products'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// Shop logo / banner (single image)
const shopUploader = multer({
  storage:  makeStorage('shops'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// User avatar (single image)
const avatarUploader = multer({
  storage:  makeStorage('avatars'),
  fileFilter: imageFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// ============================================================
// Exported middleware helpers
// ============================================================

/**
 * Upload a single image.
 * @param {string} fieldName - form-data field name
 * @param {'products'|'shops'|'avatars'} folder
 */
function uploadSingle(fieldName, folder = 'products') {
  const uploader = multer({
    storage:    makeStorage(folder),
    fileFilter: imageFilter,
    limits:     { fileSize: MAX_FILE_SIZE },
  });
  return uploader.single(fieldName);
}

/**
 * Upload multiple images (max 5).
 * @param {string} fieldName - form-data field name
 * @param {number} maxCount
 * @param {'products'|'shops'|'avatars'} folder
 */
function uploadMultiple(fieldName, maxCount = 5, folder = 'products') {
  const uploader = multer({
    storage:    makeStorage(folder),
    fileFilter: imageFilter,
    limits:     { fileSize: MAX_FILE_SIZE },
  });
  return uploader.array(fieldName, maxCount);
}

/**
 * Error handler middleware — place AFTER upload middleware in route.
 * Usage: router.post('/upload', uploadSingle('image'), handleUploadError, handler)
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'File too large. Max 5MB.' });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
}

// ============================================================
// Direct Cloudinary helpers (for use without multer)
// ============================================================

/**
 * Upload a base64 image string directly to Cloudinary.
 * Useful for AR-captured garment frames.
 * @param {string} base64String - e.g. "data:image/png;base64,..."
 * @param {string} folder
 * @returns {Promise<{url: string, publicId: string}>}
 */
async function uploadBase64(base64String, folder = 'ar-captures') {
  const result = await cloudinary.uploader.upload(base64String, {
    folder:         `ecom/${folder}`,
    allowed_formats: ALLOWED_FORMATS,
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/**
 * Delete an image from Cloudinary by its public ID.
 * @param {string} publicId
 */
async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = {
  uploadSingle,
  uploadMultiple,
  handleUploadError,
  uploadBase64,
  deleteImage,
  productUploader,
  shopUploader,
  avatarUploader,
  cloudinary,
};
