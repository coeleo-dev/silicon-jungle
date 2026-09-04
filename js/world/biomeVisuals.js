/**
 * biomeVisuals — paleta, densidade, fog e movimento por bioma (P14–P19).
 * Sem THREE e sem constants (evita segundo singleton ?v=).
 */

const DEFAULT_FOG = { color: 0x0c2438, near: 38, far: 165 };

/** @type {Record<string, string>} kind de classifyTerrainChunk */
const TERRAIN_KIND = {
  circuit_plain: 'trails',
  smd_metro: 'urban',
  thermal_swamp: 'jungle',
  atx_wastes: 'trails',
  capacitor_caves: 'mountain_cliff',
  cooler_vortex: 'mountain_slope'
};

/** Escala de densidade de veg/scatter. 1 = Sprint 2. */
const VEG_SCALE = {
  circuit_plain: { default: 1, bush: 1.35, fern: 1.3, plains_grass: 1.45, flower: 1.3 },
  smd_metro: { default: 0.4, bush: 0.3, fern: 0.35, plains_grass: 0.25 },
  thermal_swamp: { default: 0.85, fern: 1.25, plains_grass: 0.65, bush: 1.1 },
  atx_wastes: { default: 0.35, bush: 0.25, fern: 0.3, plains_grass: 0.2 },
  capacitor_caves: { default: 0.12 },
  cooler_vortex: { default: 0.3, plains_grass: 0.15, bush: 0.25 }
};

const FOG = {
  circuit_plain: { color: 0x0c2438, near: 38, far: 165 },
  smd_metro: { color: 0x0a1c2e, near: 32, far: 140 },
  thermal_swamp: { color: 0x0a1f18, near: 18, far: 88 },
  atx_wastes: { color: 0x1a1610, near: 28, far: 130 },
  capacitor_caves: { color: 0x05080e, near: 8, far: 42 },
  cooler_vortex: { color: 0x081828, near: 22, far: 110 }
};

const MOVE = {
  thermal_swamp: { speedMul: 0.55, windX: 0, windZ: 0 },
  cooler_vortex: { speedMul: 1, windX: 2.4, windZ: 0.6 }
};

export function terrainKindForBiome(id) {
  return TERRAIN_KIND[id];
}

export function vegDensityScale(id, species = 'default') {
  const row = VEG_SCALE[id];
  if (!row) return 1;
  if (species && row[species] !== undefined) return row[species];
  return row.default !== undefined ? row.default : 1;
}

export function keepPlacement(id, species = 'default') {
  const s = vegDensityScale(id, species);
  if (s >= 1) return true;
  return Math.random() < s;
}

export function extraDensity(id, species = 'default') {
  const s = vegDensityScale(id, species);
  return s > 1 ? s - 1 : 0;
}

export function fogForBiome(id) {
  return FOG[id] || DEFAULT_FOG;
}

export function moveModifiers(id) {
  return MOVE[id] || { speedMul: 1, windX: 0, windZ: 0 };
}
