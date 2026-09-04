/**
 * Setores / barramentos de campanha (P01). Só constantes e nearest-center.
 */

export const SECTOR_IDS = Object.freeze([
  'south_atx',
  'east_dimm',
  'west_io',
  'north_heatsink',
  'marco_zero'
]);

export const SECTOR_CENTERS = Object.freeze([
  { id: 'marco_zero', x: 0, z: 0 },
  { id: 'south_atx', x: -80, z: 80 },
  { id: 'east_dimm', x: 80, z: 80 },
  { id: 'west_io', x: -80, z: -80 },
  { id: 'north_heatsink', x: 70, z: -70 }
]);

export function getSectorAt(x, z) {
  let bestId = SECTOR_CENTERS[0].id;
  let bestDist = Infinity;
  for (let i = 0; i < SECTOR_CENTERS.length; i++) {
    const c = SECTOR_CENTERS[i];
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
