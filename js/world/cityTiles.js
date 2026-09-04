/** Tiles de culling da cidade (~40 m). Puro, sem Three. */
export const CITY_TILE_SIZE = 40;

export function tileIndex(x, z, size = CITY_TILE_SIZE) {
  const s = size > 0 ? size : 40;
  return { tx: Math.floor(x / s), tz: Math.floor(z / s) };
}

export function tileKey(x, z, size = CITY_TILE_SIZE) {
  const t = tileIndex(x, z, size);
  return `${t.tx}:${t.tz}`;
}

export function tileBounds(tx, tz, size = CITY_TILE_SIZE) {
  const s = size > 0 ? size : 40;
  return { minX: tx * s, maxX: (tx + 1) * s, minZ: tz * s, maxZ: (tz + 1) * s };
}
