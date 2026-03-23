// src/ar/SizeMeasurement.js
// Calculates chest, shoulder, torso from pose landmarks
// Returns measurements in cm + recommended size

import { LANDMARKS } from './PoseDetector';

const AVG_FACE_WIDTH_CM = 15; // average human face width reference

/**
 * Calculate pixel distance between two landmarks
 */
function pixelDist(a, b, canvasWidth, canvasHeight) {
  const dx = (a.x - b.x) * canvasWidth;
  const dy = (a.y - b.y) * canvasHeight;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get cm scale factor using ear-to-ear distance as reference
 */
function getCmScale(landmarks, canvasWidth, canvasHeight) {
  const leftEar = landmarks[LANDMARKS.LEFT_EAR];
  const rightEar = landmarks[LANDMARKS.RIGHT_EAR];
  if (!leftEar || !rightEar) return null;
  const facePixelWidth = pixelDist(leftEar, rightEar, canvasWidth, canvasHeight);
  if (facePixelWidth < 10) return null;
  return AVG_FACE_WIDTH_CM / facePixelWidth;
}

/**
 * Main measurement function
 * @param {Array} landmarks - MediaPipe pose landmarks array
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {{ chest: number, shoulder: number, torso: number, recommendedSize: string, fitScore: string } | null}
 */
export function getMeasurements(landmarks, canvasWidth, canvasHeight) {
  if (!landmarks || landmarks.length < 25) return null;

  const ls = landmarks[LANDMARKS.LEFT_SHOULDER];
  const rs = landmarks[LANDMARKS.RIGHT_SHOULDER];
  const lh = landmarks[LANDMARKS.LEFT_HIP];
  const rh = landmarks[LANDMARKS.RIGHT_HIP];

  if (!ls || !rs || !lh || !rh) return null;

  const scale = getCmScale(landmarks, canvasWidth, canvasHeight);
  if (!scale) return null;

  const shoulderPixels = pixelDist(ls, rs, canvasWidth, canvasHeight);
  const torsoPixels = pixelDist(
    { x: (ls.x + rs.x) / 2, y: (ls.y + rs.y) / 2 },
    { x: (lh.x + rh.x) / 2, y: (lh.y + rh.y) / 2 },
    canvasWidth,
    canvasHeight
  );

  const shoulderCm = Math.round(shoulderPixels * scale);
  // Chest is roughly shoulder * 1.05 for standing pose
  const chestCm = Math.round(shoulderCm * 1.05);
  const torsoCm = Math.round(torsoPixels * scale);

  const { recommendedSize, fitScore } = getRecommendedSize(chestCm);

  return {
    chest: chestCm,
    shoulder: shoulderCm,
    torso: torsoCm,
    recommendedSize,
    fitScore,
  };
}

/**
 * Size recommendation based on chest measurement
 */
function getRecommendedSize(chestCm) {
  if (chestCm < 82) return { recommendedSize: 'XS', fitScore: 'Slim Fit' };
  if (chestCm < 90) return { recommendedSize: 'S',  fitScore: 'Good Fit' };
  if (chestCm < 98) return { recommendedSize: 'M',  fitScore: 'Good Fit' };
  if (chestCm < 106) return { recommendedSize: 'L', fitScore: 'Good Fit' };
  if (chestCm < 114) return { recommendedSize: 'XL', fitScore: 'Relaxed Fit' };
  return { recommendedSize: 'XXL', fitScore: 'Relaxed Fit' };
}

/**
 * Compare buyer measurements with garment dimensions
 */
export function compareWithGarment(buyerMeasurements, garmentWidth, garmentHeight) {
  if (!buyerMeasurements || !garmentWidth) return null;

  const diff = garmentWidth - buyerMeasurements.chest;
  let fit = 'Good Fit';
  if (diff < -4) fit = 'Too Tight';
  else if (diff < 0) fit = 'Snug Fit';
  else if (diff > 10) fit = 'Loose Fit';

  return {
    ...buyerMeasurements,
    garmentChest: garmentWidth,
    garmentHeight,
    fit,
  };
}
