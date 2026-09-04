/**
 * Mapa lógico de biomas (P00). Só dados — sem mesh, fog ou spawn.
 * getBiomeAt = nearest-center em XZ.
 */

export const BIOME_IDS = Object.freeze([
  'circuit_plain',
  'smd_metro',
  'thermal_swamp',
  'atx_wastes',
  'capacitor_caves',
  'cooler_vortex'
]);

/** Centros Voronoi alinhados aos landmarks actuais. circuit_plain primeiro (desempate). */
export const BIOME_CENTERS = Object.freeze([
  { id: 'circuit_plain', x: 0, z: 0 },
  { id: 'atx_wastes', x: -80, z: 80 },
  { id: 'smd_metro', x: 80, z: 80 },
  { id: 'thermal_swamp', x: -70, z: 70 },
  { id: 'capacitor_caves', x: -90, z: -20 },
  { id: 'cooler_vortex', x: 0, z: -290 }
]);

export function getBiomeAt(x, z) {
  let bestId = BIOME_CENTERS[0].id;
  let bestDist = Infinity;
  for (let i = 0; i < BIOME_CENTERS.length; i++) {
    const c = BIOME_CENTERS[i];
    const dx = x - c.x;
    const dz = z - c.z;
    const d = dx * dx + dz * dz;
    if (d < bestDist) {
      bestDist = d;
      bestId = c.id;
    }
  }
  return bestId;
}
