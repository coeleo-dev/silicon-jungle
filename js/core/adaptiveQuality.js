/**
 * Ajuste adaptativo de pixel ratio quando FPS cai — invisível na maioria dos casos.
 */
import { quality } from '../config/quality.js?v=20260827';
import { renderer } from './scene.js?v=20260821';

let enabled = false;
let sampleTimer = 0;
let sampleFrames = 0;
let currentCap = null;
let bushShadowDisabled = false;

export function initAdaptiveQuality() {
  enabled = quality.adaptivePixelRatio === true;
  currentCap = quality.pixelRatioCap;
  bushShadowDisabled = false;
}

export function tickAdaptiveQuality(delta, smoothedFps) {
  if (!enabled || !renderer) return;

  sampleTimer += delta;
  sampleFrames++;
  if (sampleTimer < 2.0) return;

  const avgFps = sampleFrames / sampleTimer;
  sampleTimer = 0;
  sampleFrames = 0;

  const baseCap = quality.pixelRatioCap;
  let changed = false;

  if (avgFps < 58 && currentCap > baseCap * 0.85) {
    currentCap = Math.max(baseCap * 0.85, 0.65);
    changed = true;
  } else if (avgFps < 52 && !bushShadowDisabled) {
    quality.bushCastShadow = false;
    bushShadowDisabled = true;
    changed = true;
  } else if (avgFps >= 68 && currentCap < baseCap) {
    currentCap = Math.min(baseCap, currentCap + 0.05);
    if (bushShadowDisabled && quality.bushCastShadowDefault) {
      quality.bushCastShadow = quality.bushCastShadowDefault;
      bushShadowDisabled = false;
    }
    changed = true;
  }

  if (changed) {
    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(Math.min(dpr, currentCap));
  }
}

export function getAdaptivePixelCap() {
  return currentCap ?? quality.pixelRatioCap;
}
