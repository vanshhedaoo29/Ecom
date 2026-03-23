// src/ar/AREngine.js
// Master AR controller — combines PoseDetector + GarmentOverlay + SizeMeasurement

import { initPoseDetector, stopPoseDetector } from './PoseDetector';
import { loadGarmentImage, drawFrame, clearGarment } from './GarmentOverlay';
import { getMeasurements, compareWithGarment } from './SizeMeasurement';

let currentLandmarks = null;
let renderLoopId = null;
let isRunning = false;
let onMeasurementsUpdate = null;
let garmentMeta = null; // { width_cm, height_cm }

/**
 * Start AR session
 * @param {HTMLVideoElement} videoElement - buyer's live camera
 * @param {HTMLCanvasElement} canvasElement - overlay canvas
 * @param {string} garmentImageUrl - garment image from seller
 * @param {{ width_cm, height_cm }} garmentDimensions - from product data
 * @param {Function} onMeasurements - callback with measurements update
 */
export async function startAR(videoElement, canvasElement, garmentImageUrl, garmentDimensions, onMeasurements) {
  if (isRunning) stopAR();

  isRunning = true;
  onMeasurementsUpdate = onMeasurements || null;
  garmentMeta = garmentDimensions || null;

  // Load garment image
  try {
    await loadGarmentImage(garmentImageUrl);
  } catch (err) {
    console.error('[AREngine] Failed to load garment image:', err);
  }

  // Set canvas size to match video
  canvasElement.width = videoElement.videoWidth || 640;
  canvasElement.height = videoElement.videoHeight || 480;

  // Init pose detector
  await initPoseDetector(videoElement, (results) => {
    if (results.poseLandmarks) {
      currentLandmarks = results.poseLandmarks;

      // Calculate measurements and fire callback
      if (onMeasurementsUpdate) {
        const raw = getMeasurements(
          currentLandmarks,
          canvasElement.width,
          canvasElement.height
        );
        if (raw) {
          const final = garmentMeta
            ? compareWithGarment(raw, garmentMeta.width_cm, garmentMeta.height_cm)
            : raw;
          onMeasurementsUpdate(final);
        }
      }
    }
  });

  // Start render loop
  const render = () => {
    if (!isRunning) return;
    drawFrame(canvasElement, videoElement, currentLandmarks);
    renderLoopId = requestAnimationFrame(render);
  };
  render();
}

/**
 * Stop AR session and clean up
 */
export function stopAR() {
  isRunning = false;
  if (renderLoopId) {
    cancelAnimationFrame(renderLoopId);
    renderLoopId = null;
  }
  stopPoseDetector();
  clearGarment();
  currentLandmarks = null;
  onMeasurementsUpdate = null;
}

/**
 * Get latest measurements snapshot
 */
export function getLatestMeasurements(canvasElement) {
  if (!currentLandmarks || !canvasElement) return null;
  return getMeasurements(currentLandmarks, canvasElement.width, canvasElement.height);
}
