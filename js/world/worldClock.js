/**
 * Relógio de mundo (P21). timeOfDay 0–1; 0 = meia-noite.
 * Sem Three.js. storm é estado; o roll fica no P23.
 */

export const worldClock = {
  timeOfDay: 0,
  storm: false
};

export function resetWorldClock() {
  worldClock.timeOfDay = 0;
  worldClock.storm = false;
  return worldClock;
}

export function isNight(t = worldClock.timeOfDay) {
  return t > 0.78 || t < 0.22;
}

export function tickWorldClock(delta, { paused = false, cycleSeconds = 180 } = {}) {
  if (paused) return worldClock;
  const cycle = cycleSeconds > 0 ? cycleSeconds : 180;
  worldClock.timeOfDay = (worldClock.timeOfDay + delta / cycle) % 1;
  if (worldClock.timeOfDay < 0) worldClock.timeOfDay += 1;
  return worldClock;
}

export function applyWorldClock(saved) {
  const t = saved?.timeOfDay;
  if (typeof t === 'number' && Number.isFinite(t)) {
    worldClock.timeOfDay = t - Math.floor(t);
  } else {
    worldClock.timeOfDay = 0;
  }
  worldClock.storm = !!saved?.storm;
  return worldClock;
}

export function snapshotWorldClock() {
  return { timeOfDay: worldClock.timeOfDay, storm: worldClock.storm };
}

/** 0 = meia-noite, 0.25 = amanhecer, 0.5 = meio-dia, 0.75 = crepúsculo. */
export function skySample(t) {
  const ang = (t - 0.25) * Math.PI * 2;
  const elevation = Math.sin(ang);
  const day = Math.max(0, Math.min(1, (elevation + 0.15) / 1.05));
  const night = 1 - day;
  return {
    elevation,
    day,
    night,
    fogFarMul: 0.55 + 0.45 * day,
    fogNearMul: 0.75 + 0.25 * day,
    fogDark: night,
    bioOpacity: 0.4 + 0.5 * night,
    keyIntensity: 0.48 + 0.72 * day,
    ambientMul: 0.55 + 0.55 * day,
    hemiMul: 0.5 + 0.7 * day
  };
}

/** Direção unitária do sol no céu. y < 0 = abaixo do horizonte. */
export function sunDirection(t) {
  const ang = (t - 0.25) * Math.PI * 2;
  const x = Math.cos(ang);
  const y = Math.sin(ang);
  const z = 0.4;
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

export function mixHex(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 255;
  const ag = (a >> 8) & 255;
  const ab = a & 255;
  const br = (b >> 16) & 255;
  const bg = (b >> 8) & 255;
  const bb = b & 255;
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bch = Math.round(ab + (bb - ab) * k);
  return (r << 16) | (g << 8) | bch;
}

export function darkenHex(hex, dark01) {
  const k = 1 - 0.45 * Math.max(0, Math.min(1, dark01));
  const r = Math.round(((hex >> 16) & 255) * k);
  const g = Math.round(((hex >> 8) & 255) * k);
  const b = Math.round((hex & 255) * k);
  return (r << 16) | (g << 8) | b;
}

export function lightenHex(hex, lift01) {
  return mixHex(hex, 0xd8eef8, Math.max(0, Math.min(1, lift01)));
}

export function applyTodFog(biomeFog, t) {
  const s = skySample(t);
  const nightCol = darkenHex(biomeFog.color, 0.4);
  const dayCol = lightenHex(biomeFog.color, 0.78);
  return {
    color: mixHex(nightCol, dayCol, s.day),
    near: biomeFog.near * s.fogNearMul,
    far: biomeFog.far * s.fogFarMul
  };
}
