/**
 * quality.js — Sistema de Qualidade Gráfica (LOW / MED / HIGH)
 * Controla pixelRatio adaptativo, precision do renderer, tamanho do shadow map
 * e densidade de vegetação. Presets pensados para PCs não potentes.
 */
export const QUALITY_PRESETS = {
  LOW: {
    label: 'Low',
    pixelRatioCap: 0.75,
    precision: 'mediump',
    shadowMapSize: 512,
    vegetationDensity: 0.55,
    shadowCasterDistance: 36,
    bushCastShadow: false,
    adaptivePixelRatio: true,
    outlineBodyOnly: true
  },
  MED: {
    label: 'Medium',
    pixelRatioCap: 1.0,
    precision: 'mediump',
    shadowMapSize: 1024,
    vegetationDensity: 0.85,
    shadowCasterDistance: 48,
    bushCastShadow: false,
    adaptivePixelRatio: false,
    outlineBodyOnly: true
  },
  HIGH: {
    label: 'High',
    pixelRatioCap: 1.5,
    precision: 'highp',
    shadowMapSize: 2048,
    vegetationDensity: 1.0,
    shadowCasterDistance: 55,
    bushCastShadow: true,
    adaptivePixelRatio: true,
    outlineBodyOnly: true
  }
};

/**
 * Retorna o preset inicial: `?quality=HIGH` na URL > localStorage > MÉDIA.
 * Precisa ser resolvido ANTES da criação do renderer (scene.js o lê no load).
 */
function getInitialLevel() {
  if (typeof window === 'undefined') return 'MED';
  try {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('quality');
    if (q && QUALITY_PRESETS[q.toUpperCase()]) return q.toUpperCase();
    const saved = window.localStorage.getItem('mw_quality');
    if (saved && QUALITY_PRESETS[saved]) return saved;
  } catch (e) { /* localStorage pode não estar disponível */ }
  return 'MED';
}

export let quality = QUALITY_PRESETS[getInitialLevel()] || QUALITY_PRESETS.MED;
if (quality.bushCastShadowDefault === undefined) {
  quality.bushCastShadowDefault = quality.bushCastShadow;
}

export function setQuality(level) {
  const preset = QUALITY_PRESETS[level] || QUALITY_PRESETS.MED;
  quality = { ...preset, bushCastShadowDefault: preset.bushCastShadow };
  try {
    window.localStorage.setItem('mw_quality', level in QUALITY_PRESETS ? level : 'MED');
  } catch (e) { /* ignore */ }
}

export function getQuality() {
  return quality;
}

/**
 * Aplica o pixelRatio adaptativo (min(devicePixelRatio, cap do preset))
 * @param {THREE.WebGLRenderer} renderer
 */
export function applyPixelRatio(renderer) {
  if (!renderer) return;
  const dpr = window.devicePixelRatio || 1;
  renderer.setPixelRatio(Math.min(dpr, quality.pixelRatioCap));
}
