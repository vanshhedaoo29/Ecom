// src/components/ARTryOn.jsx
// AR Try-On overlay shown during video call when seller triggers AR

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { startAR, stopAR } from '../ar/AREngine';
import '../theme.css';

const css = `
  .ar-root {
    position: fixed;
    inset: 0;
    background: #000;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    font-family: var(--font-body);
    color: var(--white);
  }

  /* TOP BAR */
  .ar-topbar {
    height: 52px;
    background: rgba(0,0,0,0.85);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    flex-shrink: 0;
    z-index: 10;
  }

  .ar-title {
    font-size: 11px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }

  .ar-close-btn {
    padding: 8px 20px;
    background: var(--white);
    border: none;
    color: var(--black);
    font-family: var(--font-body);
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .ar-close-btn:hover { opacity: 0.85; }

  /* MAIN AREA */
  .ar-body {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  /* CANVAS - full camera view with garment overlay */
  .ar-canvas-wrap {
    flex: 1;
    position: relative;
    background: #000;
    overflow: hidden;
  }

  .ar-video {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .ar-canvas {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: scaleX(-1); /* mirror */
  }

  /* Loading state */
  .ar-loading {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: #0a0a0a;
  }

  .ar-loading-spinner {
    width: 36px; height: 36px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: var(--white);
    border-radius: 50%;
    animation: ar-spin 0.8s linear infinite;
  }

  @keyframes ar-spin { to { transform: rotate(360deg); } }

  .ar-loading-text {
    font-size: 12px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
  }

  /* SIZE PANEL */
  .ar-panel {
    width: 280px;
    background: #0a0a0a;
    border-left: 1px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
  }

  .ar-panel-section {
    padding: 20px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .ar-panel-label {
    font-size: 9px;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
    margin-bottom: 16px;
    font-weight: 500;
  }

  /* SIZE BADGE */
  .ar-size-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  .ar-size-val {
    font-family: var(--font-display);
    font-size: 64px;
    font-weight: 300;
    color: var(--white);
    line-height: 1;
  }

  .ar-fit-badge {
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 500;
    padding: 5px 14px;
    border: 1px solid rgba(255,255,255,0.2);
    color: rgba(255,255,255,0.6);
  }

  .ar-fit-badge.good { border-color: rgba(34,197,94,0.4); color: #22c55e; }
  .ar-fit-badge.tight { border-color: rgba(239,68,68,0.4); color: #ef4444; }
  .ar-fit-badge.loose { border-color: rgba(245,158,11,0.4); color: #f59e0b; }

  /* MEASUREMENTS */
  .ar-measurements {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .ar-measure-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ar-measure-label {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    font-weight: 300;
  }

  .ar-measure-val {
    font-size: 13px;
    color: rgba(255,255,255,0.75);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
  }

  /* GARMENT INFO */
  .ar-garment-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .ar-garment-thumb {
    width: 48px;
    height: 60px;
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.08);
    overflow: hidden;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .ar-garment-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ar-garment-name {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
    margin-bottom: 4px;
  }

  .ar-garment-price {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
  }

  /* BOTTOM BUTTONS */
  .ar-actions {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: auto;
  }

  .ar-cart-btn {
    width: 100%;
    padding: 14px;
    background: var(--white);
    border: none;
    color: var(--black);
    font-family: var(--font-body);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .ar-cart-btn:hover { opacity: 0.88; }
  .ar-cart-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .ar-dismiss-btn {
    width: 100%;
    padding: 13px;
    background: none;
    border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.4);
    font-family: var(--font-body);
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
  }
  .ar-dismiss-btn:hover { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.7); }

  /* NO DETECTION */
  .ar-no-detection {
    padding: 20px;
    text-align: center;
    font-size: 12px;
    color: rgba(255,255,255,0.2);
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .ar-body { flex-direction: column; }
    .ar-panel { width: 100%; height: 220px; border-left: none; border-top: 1px solid rgba(255,255,255,0.08); }
    .ar-size-val { font-size: 48px; }
  }
`;

function getFitClass(fit) {
  if (!fit) return '';
  const f = fit.toLowerCase();
  if (f.includes('tight')) return 'tight';
  if (f.includes('loose')) return 'loose';
  return 'good';
}

export default function ARTryOn({ garmentImageUrl, garmentName, garmentPrice, garmentDimensions, onClose, onAddToCart }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState(null);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleMeasurements = useCallback((m) => {
    setMeasurements(m);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        // Get camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });

        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Wait for video to be ready
        await new Promise(res => {
          videoRef.current.onloadedmetadata = res;
        });

        if (!mounted) return;

        // Start AR engine
        await startAR(
          videoRef.current,
          canvasRef.current,
          garmentImageUrl,
          garmentDimensions,
          handleMeasurements
        );

        if (mounted) setLoading(false);
      } catch (err) {
        console.error('[ARTryOn] Init error:', err);
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      stopAR();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [garmentImageUrl, garmentDimensions, handleMeasurements]);

  const handleAddToCart = async () => {
    if (!onAddToCart) return;
    setAdding(true);
    try {
      await onAddToCart(measurements?.recommendedSize);
      setAdded(true);
    } catch {}
    finally { setAdding(false); }
  };

  return (
    <>
      <style>{css}</style>
      <div className="ar-root">
        {/* Top bar */}
        <div className="ar-topbar">
          <span className="ar-title">AR Try-On</span>
          <button className="ar-close-btn" onClick={onClose}>✕ Close</button>
        </div>

        <div className="ar-body">
          {/* Camera + Canvas */}
          <div className="ar-canvas-wrap">
            <video ref={videoRef} className="ar-video" playsInline muted/>
            <canvas ref={canvasRef} className="ar-canvas"/>

            {loading && (
              <div className="ar-loading">
                <div className="ar-loading-spinner"/>
                <div className="ar-loading-text">Starting AR…</div>
              </div>
            )}
          </div>

          {/* Size Panel */}
          <div className="ar-panel">

            {/* Garment info */}
            {(garmentName || garmentImageUrl) && (
              <div className="ar-panel-section">
                <div className="ar-panel-label">Garment</div>
                <div className="ar-garment-info">
                  <div className="ar-garment-thumb">
                    {garmentImageUrl
                      ? <img src={garmentImageUrl} alt="garment"/>
                      : '👗'}
                  </div>
                  <div>
                    {garmentName && <div className="ar-garment-name">{garmentName}</div>}
                    {garmentPrice && <div className="ar-garment-price">₹{garmentPrice}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Size recommendation */}
            <div className="ar-panel-section">
              <div className="ar-panel-label">Recommended Size</div>
              {measurements ? (
                <div className="ar-size-badge">
                  <div className="ar-size-val">{measurements.recommendedSize || '—'}</div>
                  <div className={`ar-fit-badge ${getFitClass(measurements.fit || measurements.fitScore)}`}>
                    {measurements.fit || measurements.fitScore || 'Good Fit'}
                  </div>
                </div>
              ) : (
                <div className="ar-no-detection">
                  Stand back so your full upper body is visible in the camera
                </div>
              )}
            </div>

            {/* Measurements */}
            <div className="ar-panel-section">
              <div className="ar-panel-label">Your Measurements</div>
              {measurements ? (
                <div className="ar-measurements">
                  <div className="ar-measure-row">
                    <span className="ar-measure-label">Chest</span>
                    <span className="ar-measure-val">{measurements.chest} cm</span>
                  </div>
                  <div className="ar-measure-row">
                    <span className="ar-measure-label">Shoulder</span>
                    <span className="ar-measure-val">{measurements.shoulder} cm</span>
                  </div>
                  <div className="ar-measure-row">
                    <span className="ar-measure-label">Torso</span>
                    <span className="ar-measure-val">{measurements.torso} cm</span>
                  </div>
                  {measurements.garmentChest && (
                    <div className="ar-measure-row" style={{marginTop:8,paddingTop:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                      <span className="ar-measure-label">Garment Width</span>
                      <span className="ar-measure-val">{measurements.garmentChest} cm</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="ar-no-detection">Detecting body…</div>
              )}
            </div>

            {/* Actions */}
            <div className="ar-actions">
              {onAddToCart && (
                <button
                  className="ar-cart-btn"
                  onClick={handleAddToCart}
                  disabled={adding || added}
                >
                  {added ? '✓ Added to Cart' : adding ? 'Adding…' : 'Add to Cart'}
                </button>
              )}
              <button className="ar-dismiss-btn" onClick={onClose}>
                Back to Call
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
