/**
 * Estatísticas de FPS e renderer.info para ?perf=1
 */
import { scene } from './scene.js?v=20260821';

export let perfOverlayEnabled = false;
export let lastSnapshot = null;

export function initPerfOverlay() {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    perfOverlayEnabled = params.get('perf') === '1';
  } catch (e) {
    perfOverlayEnabled = false;
  }
}

let windowTimer = 0;
let windowFrames = 0;
let windowMinFps = Infinity;

export function tickPerfStats(delta, renderer) {
  if (!perfOverlayEnabled) return null;

  windowTimer += delta;
  windowFrames++;
  const instantFps = delta > 0 ? 1 / delta : 0;
  if (instantFps < windowMinFps) windowMinFps = instantFps;

  if (windowTimer >= 1.0) {
    const avg = Math.round(windowFrames / windowTimer);
    const min = Math.round(windowMinFps === Infinity ? avg : windowMinFps);
    windowTimer = 0;
    windowFrames = 0;
    windowMinFps = Infinity;

    let calls = 0;
    let tris = 0;
    let geos = 0;
    let texs = 0;
    if (renderer && renderer.info && renderer.info.render) {
      calls = renderer.info.render.calls;
      tris = renderer.info.render.triangles;
    }
    if (renderer && renderer.info && renderer.info.memory) {
      geos = renderer.info.memory.geometries;
      texs = renderer.info.memory.textures;
    }

    lastSnapshot = {
      avg,
      min,
      calls,
      tris,
      geos,
      texs,
      lights: countVisiblePointLights()
    };
    return lastSnapshot;
  }
  return null;
}

function countVisiblePointLights() {
  let n = 0;
  if (!scene || typeof scene.traverse !== 'function') return n;
  scene.traverse((obj) => {
    if (obj.isPointLight && obj.visible) n++;
  });
  return n;
}
