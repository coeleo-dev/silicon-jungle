/**
 * lighting.js — Ciclo dia/noite (P22) + flash de tempestade (P23).
 * Luar ciano de noite; chave mais quente de dia. Sem breu total.
 */
import { scene } from './scene.js?v=20260821';
import { CONFIG } from '../config/constants.js?v=20260821';
import { quality } from '../config/quality.js?v=20260827';
import { skySample, sunDirection } from '../world/worldClock.js?v=20260911';

let bioParticlePoints = null;
let bioParticlePositions = null;
let bioParticleColors = null;
const NUM_BIO_PARTICLES = 220;

let sunLightRef = null;
let ambientRef = null;
let hemiRef = null;
let lightningLight = null;
let sunDisc = null;
let shadowFollowFrame = 0;
let stormFlash = 0;
const keyOffset = { x: 80, y: 130, z: 60 };
const SUN_DISC_DIST = 175;
const _moonColor = new THREE.Color();
const _dayColor = new THREE.Color();
const _skyNight = new THREE.Color();
const _skyDay = new THREE.Color();
const _hemiNight = new THREE.Color(0x38bdf8);
const _hemiDay = new THREE.Color(0xc8eaf5);
const _ambNight = new THREE.Color(0x1e293b);
const _ambDay = new THREE.Color(0x7b8ea3);

export function setupLighting() {
  const ambientLight = new THREE.AmbientLight(0x1e293b, 0.5);
  scene.add(ambientLight);
  ambientRef = ambientLight;

  const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x142820, 0.6);
  scene.add(hemiLight);
  hemiRef = hemiLight;

  const sunLight = new THREE.DirectionalLight(CONFIG.WORLD.SUN_COLOR, 1.05);
  sunLight.position.set(CONFIG.WORLD.SUN_POS.x, CONFIG.WORLD.SUN_POS.y, CONFIG.WORLD.SUN_POS.z);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = quality.shadowMapSize;
  sunLight.shadow.mapSize.height = quality.shadowMapSize;
  sunLight.shadow.camera.near = 10;
  sunLight.shadow.camera.far = 220;
  const shadowExtent = quality.shadowCasterDistance ?? 48;
  sunLight.shadow.camera.left = -shadowExtent;
  sunLight.shadow.camera.right = shadowExtent;
  sunLight.shadow.camera.top = shadowExtent;
  sunLight.shadow.camera.bottom = -shadowExtent;
  sunLight.shadow.bias = -0.0004;
  sunLight.shadow.normalBias = 0.035;
  scene.add(sunLight);
  scene.add(sunLight.target);
  sunLightRef = sunLight;

  lightningLight = new THREE.PointLight(0xdbeafe, 0, 90, 2);
  scene.add(lightningLight);

  sunDisc = createSunDisc();

  setupAtmosphericBioluminescence();

  return { ambientLight, hemiLight, sunLight };
}

export function triggerLightningFlash(x, y, z) {
  stormFlash = 1;
  if (lightningLight) {
    lightningLight.position.set(x, y, z);
    lightningLight.intensity = 9;
  }
}

function createSunDisc() {
  const group = new THREE.Group();
  group.name = 'sunDisc';

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(26, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffc98a,
      fog: false,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    })
  );
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(12, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffe8a8,
      fog: false
    })
  );
  group.add(glow);
  group.add(core);
  group.visible = false;
  scene.add(group);
  return group;
}

/**
 * Segue o jogador movendo a luz e o target no mundo.
 * Não mexe em shadow.camera: em r128 ela é filha da DirectionalLight (espaço local).
 */
export function updateShadowFollow(cameraPos) {
  if (!sunLightRef || !cameraPos) return;
  shadowFollowFrame++;
  if (shadowFollowFrame % 6 !== 0) return;

  sunLightRef.position.set(cameraPos.x + keyOffset.x, keyOffset.y, cameraPos.z + keyOffset.z);
  sunLightRef.target.position.set(cameraPos.x, 0, cameraPos.z);
  sunLightRef.target.updateMatrixWorld();
}

function setupAtmosphericBioluminescence() {
  const geo = new THREE.BufferGeometry();
  bioParticlePositions = new Float32Array(NUM_BIO_PARTICLES * 3);
  bioParticleColors = new Float32Array(NUM_BIO_PARTICLES * 3);

  const colors = [
    new THREE.Color(0x00f0ff),
    new THREE.Color(0x34d399),
    new THREE.Color(0xfbbf24),
    new THREE.Color(0xa855f7),
    new THREE.Color(0x38bdf8)
  ];

  for (let i = 0; i < NUM_BIO_PARTICLES; i++) {
    bioParticlePositions[i * 3] = (Math.random() - 0.5) * 180;
    bioParticlePositions[i * 3 + 1] = 0.8 + Math.random() * 22.0;
    bioParticlePositions[i * 3 + 2] = (Math.random() - 0.5) * 180;

    const col = colors[i % colors.length];
    bioParticleColors[i * 3] = col.r;
    bioParticleColors[i * 3 + 1] = col.g;
    bioParticleColors[i * 3 + 2] = col.b;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(bioParticlePositions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(bioParticleColors, 3));

  const mat = new THREE.PointsMaterial({
    size: 0.65,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });

  bioParticlePoints = new THREE.Points(geo, mat);
  scene.add(bioParticlePoints);
}

export function updateAtmosphericLighting(delta, time, cameraPos, timeOfDay = 0) {
  const s = skySample(timeOfDay);
  const dir = sunDirection(timeOfDay);

  if (dir.y > 0.04) {
    keyOffset.x = dir.x * 90;
    keyOffset.y = Math.max(16, dir.y * 140);
    keyOffset.z = dir.z * 90;
  } else {
    keyOffset.x = 50;
    keyOffset.y = 120;
    keyOffset.z = 40;
  }

  if (sunLightRef) {
    _moonColor.setHex(CONFIG.WORLD.SUN_COLOR);
    _dayColor.setHex(CONFIG.WORLD.SUN_DAY_COLOR ?? 0xffc98a);
    sunLightRef.color.copy(_moonColor).lerp(_dayColor, s.day);
    sunLightRef.intensity = s.keyIntensity;
  }
  if (ambientRef) {
    ambientRef.color.copy(_ambNight).lerp(_ambDay, s.day);
    ambientRef.intensity = 0.5 * s.ambientMul;
  }
  if (hemiRef) {
    hemiRef.color.copy(_hemiNight).lerp(_hemiDay, s.day);
    hemiRef.intensity = 0.6 * s.hemiMul;
  }

  if (scene.background) {
    _skyNight.setHex(CONFIG.WORLD.SKY_COLOR);
    _skyDay.setHex(CONFIG.WORLD.SKY_DAY_COLOR ?? 0x8ecae8);
    scene.background.copy(_skyNight).lerp(_skyDay, s.day);
  }

  if (sunDisc && cameraPos) {
    const above = dir.y > -0.06;
    sunDisc.visible = above && s.day > 0.02;
    if (sunDisc.visible) {
      const discY = Math.max(dir.y, 0.14);
      sunDisc.position.set(
        cameraPos.x + dir.x * SUN_DISC_DIST,
        cameraPos.y + discY * SUN_DISC_DIST,
        cameraPos.z + dir.z * SUN_DISC_DIST
      );
      const fade = Math.max(0, Math.min(1, (dir.y + 0.06) / 0.28));
      sunDisc.scale.setScalar(0.65 + 0.45 * fade);
      const glow = sunDisc.children[0];
      if (glow && glow.material) glow.material.opacity = 0.18 + 0.28 * fade;
    }
  }

  if (stormFlash > 0) {
    stormFlash = Math.max(0, stormFlash - delta * 3.8);
    if (sunLightRef) sunLightRef.intensity += 2.4 * stormFlash;
    if (lightningLight) lightningLight.intensity = 9 * stormFlash;
  } else if (lightningLight) {
    lightningLight.intensity = 0;
  }

  if (bioParticlePoints) {
    bioParticlePoints.rotation.y += delta * 0.04;
    bioParticlePoints.position.y = Math.sin(time * 0.4) * 0.25;
    if (bioParticlePoints.material) {
      bioParticlePoints.material.opacity = s.bioOpacity;
    }
  }
}
