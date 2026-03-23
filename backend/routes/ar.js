// routes/ar.js — AR Fit Recommendation API
// POST /api/ar/dimensions

const express = require('express');
const router  = express.Router();
const { authMiddleware } = require('../middleware/auth');

// ── Fit calculation logic ────────────────────────────────────
function calculateFit(garment, buyer) {
  const chestDiff    = Math.abs(garment.chest    - buyer.chest);
  const shoulderDiff = Math.abs(garment.shoulder - buyer.shoulder);
  const avgDiff      = (chestDiff + shoulderDiff) / 2;

  let recommendedSize;
  let fitScore;
  let message;

  if (avgDiff <= 2) {
    recommendedSize = 'M';
    fitScore        = 95;
    message         = 'Perfect fit — Size M';
  } else if (avgDiff <= 4) {
    recommendedSize = 'L';
    fitScore        = 75;
    message         = 'Good fit — go one size up';
  } else {
    recommendedSize = 'XL';
    fitScore        = 50;
    message         = 'Size up recommended';
  }

  return { recommendedSize, fitScore, message };
}

// ── POST /api/ar/dimensions ──────────────────────────────────
// Body: {
//   callId: string,
//   garmentDimensions: { chest, shoulder, length },
//   buyerDimensions:   { chest, shoulder, height }
// }
router.post('/dimensions', authMiddleware, async (req, res) => {
  const { callId, garmentDimensions, buyerDimensions } = req.body;

  // Validate
  if (!garmentDimensions || !buyerDimensions) {
    return res.status(422).json({
      success: false,
      message: 'garmentDimensions and buyerDimensions are required',
    });
  }
  if (
    garmentDimensions.chest    == null ||
    garmentDimensions.shoulder == null ||
    buyerDimensions.chest      == null ||
    buyerDimensions.shoulder   == null
  ) {
    return res.status(422).json({
      success: false,
      message: 'chest and shoulder values are required in both dimensions',
    });
  }

  // Calculate fit
  const { recommendedSize, fitScore, message } = calculateFit(garmentDimensions, buyerDimensions);

  // Save to ar_sessions table
  const db = global.db;
  try {
    await db.query(
      `INSERT INTO ar_sessions
         (call_id, buyer_id, garment_dimensions, buyer_dimensions, recommended_size, fit_score)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        callId     || null,
        req.user.id,
        JSON.stringify(garmentDimensions),
        JSON.stringify(buyerDimensions),
        recommendedSize,
        fitScore,
      ]
    );
  } catch (err) {
    // Log but don't fail — still return the fit result to frontend
    console.error('[AR/dimensions] DB save failed:', err.message);
  }

  return res.json({
    success: true,
    recommendedSize,
    fitScore,
    message,
  });
});

// ── GET /api/ar/sessions — get AR session history for buyer ──
router.get('/sessions', authMiddleware, async (req, res) => {
  const db = global.db;
  try {
    const [sessions] = await db.query(
      `SELECT * FROM ar_sessions WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
