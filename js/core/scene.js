import { CONFIG } from '../config/constants.js?v=20260821';
import { quality, applyPixelRatio } from '../config/quality.js?v=20260827';

export function createToonGradient() {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 1;
  const ctx = c.getContext('2d');
  
  ctx.fillStyle = '#05080f'; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#1a2837'; ctx.fillRect(1, 0, 1, 1);
  ctx.fillStyle = '#4d6a88'; ctx.fillRect(2, 0, 1, 1);
  ctx.fillStyle = '#f2f8ff'; ctx.fillRect(3, 0, 1, 1);

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

export const toonGradient = createToonGradient();

export const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.WORLD.SKY_COLOR);
scene.fog = new THREE.Fog(CONFIG.WORLD.FOG_COLOR, CONFIG.WORLD.FOG_NEAR, CONFIG.WORLD.FOG_FAR);

export const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  240
);
camera.position.set(
  CONFIG.PLAYER.INITIAL_POSITION.x,
  CONFIG.PLAYER.INITIAL_POSITION.y,
  CONFIG.PLAYER.INITIAL_POSITION.z
);

export const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('webgl-canvas'),
  antialias: false,
  powerPreference: 'high-performance',
  precision: quality.precision
});
renderer.setSize(window.innerWidth, window.innerHeight);
applyPixelRatio(renderer);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // Sombras nítidas e de alta performance
renderer.toneMapping = THREE.NoToneMapping; // Cel-shaded: cores planas e fieis, sem curva de filme (ACES removido)

export function createCelMaterial(colorHex) {
  return new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: toonGradient
  });
}
