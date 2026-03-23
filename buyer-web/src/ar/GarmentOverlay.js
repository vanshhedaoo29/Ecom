// src/ar/GarmentOverlay.js
// Draws garment image overlaid on buyer camera using pose landmarks

import { LANDMARKS } from './PoseDetector';

let garmentImage = null;

/**
 * Preload garment image
 */
export function loadGarmentImage(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { garmentImage = img; resolve(img); };
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * Draw one frame: video + garment overlay
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLVideoElement} video
 * @param {Array} landmarks - MediaPipe pose landmarks
 */
export function drawFrame(canvas, video, landmarks) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  // 1. Draw mirrored video frame
  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(video, -W, 0, W, H);
  ctx.restore();

  // 2. If no garment or no landmarks, done
  if (!garmentImage || !landmarks || landmarks.length < 25) return;

  const ls = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rs = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const lh = landmarks[LANDMARKS.LEFT_HIP];
  const rh = landmarks[LANDMARKS.RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) return;

  // Mirror x (because video is mirrored)
  const mirrorX = (x) => 1 - x;

  const lsx = mirrorX(ls.x) * W;
  const rsx = mirrorX(rs.x) * W;
  const lsy = ls.y * H;
  const rsy = rs.y * H;
  const lhx = mirrorX(lh.x) * W;
  const rhx = mirrorX(rh.x) * W;
  const lhy = lh.y * H;
  const rhy = rh.y * H;

  // 3. Calculate garment position
  const shoulderMidX = (lsx + rsx) / 2;
  const shoulderMidY = (lsy + rsy) / 2;
  const hipMidY = (lhy + rhy) / 2;

  const garmentWidth = Math.abs(lsx - rsx) * 1.3;  // 30% wider than shoulder span
  const garmentHeight = (hipMidY - shoulderMidY) * 1.15; // slightly below hips

  const garmentX = shoulderMidX - garmentWidth / 2;
  const garmentY = shoulderMidY - garmentHeight * 0.08; // slight upward offset

  // 4. Draw garment with alpha blend
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.drawImage(garmentImage, garmentX, garmentY, garmentWidth, garmentHeight);
  ctx.restore();
}

/**
 * Clear garment image
 */
export function clearGarment() {
  garmentImage = null;
}
