// src/ar/PoseDetector.js
// Detects 33 body landmarks from buyer camera using MediaPipe Pose

let pose = null;
let animFrameId = null;
let onResultsCallback = null;

export async function initPoseDetector(videoElement, onResults) {
  onResultsCallback = onResults;

  // Dynamically load MediaPipe Pose from CDN
  if (!window.Pose) {
    await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
  }

  pose = new window.Pose({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
  });

  pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  pose.onResults((results) => {
    if (onResultsCallback) onResultsCallback(results);
  });

  // Start detection loop
  const detect = async () => {
    if (videoElement.readyState >= 2) {
      await pose.send({ image: videoElement });
    }
    animFrameId = requestAnimationFrame(detect);
  };

  detect();
}

export function stopPoseDetector() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (pose) {
    pose.close();
    pose = null;
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Key landmark indices from MediaPipe Pose
export const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  NOSE: 0,
};
