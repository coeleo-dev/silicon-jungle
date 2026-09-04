/**
 * Grade de construção: snap, occupancy, paredes canónicas. Puro (sem Three/terreno).
 */
export const CELL_SIZE = 1;
export const STOREY_HEIGHT = 2.2;
export const BUILD_RANGE = 12;

const HALF_PI = Math.PI / 2;

export function snapCell(x, z) {
  return { ix: Math.round(x), iz: Math.round(z) };
}

export function floorY(ix, iz, layer, heightFn) {
  const h = typeof heightFn === 'function' ? heightFn(ix, iz) : 0;
  return h + (Number(layer) || 0) * STOREY_HEIGHT;
}

/** Layer from look-at height. Floor (not round) so eye-height ~1.6 m stays layer 0. */
export function storeyLayerFromAim(aimY, groundY) {
  const d = (Number(aimY) || 0) - (Number(groundY) || 0);
  let layer = Math.floor(d / STOREY_HEIGHT);
  if (!Number.isFinite(layer) || layer < 0) layer = 0;
  if (layer > 8) layer = 8;
  return layer;
}

export function rotateYaw90(rad) {
  return (Number(rad) || 0) + HALF_PI;
}

export function yawStep(rad) {
  return rotateYaw90(rad);
}

/** yaw 0 = +Z (Three rotateY). */
export function yawToDir(rad) {
  const q = ((Math.round((Number(rad) || 0) / HALF_PI) % 4) + 4) % 4;
  if (q === 0) return { dx: 0, dz: 1 };
  if (q === 1) return { dx: 1, dz: 0 };
  if (q === 2) return { dx: 0, dz: -1 };
  return { dx: -1, dz: 0 };
}

export function neighborCell(ix, iz, yaw) {
  const d = yawToDir(yaw);
  return { ix: ix + d.dx, iz: iz + d.dz };
}

export function canonicalWall(ix, iz, layer, localEdge) {
  const L = Number(layer) || 0;
  if (localEdge === 'W') return { ix: ix - 1, iz, layer: L, edge: 'E' };
  if (localEdge === 'S') return { ix, iz: iz - 1, layer: L, edge: 'N' };
  if (localEdge === 'N' || localEdge === 'E') return { ix, iz, layer: L, edge: localEdge };
  return { ix, iz, layer: L, edge: 'N' };
}

export function floorKey(ix, iz, layer) {
  return `floor:${ix}:${iz}:${Number(layer) || 0}`;
}

export function wallKey(ix, iz, layer, localEdge) {
  const w = canonicalWall(ix, iz, layer, localEdge);
  return `wall:${w.ix}:${w.iz}:${w.layer}:${w.edge}`;
}

export function doorKey(ix, iz, layer, localEdge) {
  const w = canonicalWall(ix, iz, layer, localEdge);
  return `door:${w.ix}:${w.iz}:${w.layer}:${w.edge}`;
}

export function stairKey(ix, iz, layer) {
  return `stair:${ix}:${iz}:${Number(layer) || 0}`;
}

export function furnKey(ix, iz, layer) {
  return `furn:${ix}:${iz}:${Number(layer) || 0}`;
}

export function createOccupancy() {
  const set = new Set();
  return {
    has: (k) => set.has(k),
    add: (k) => {
      if (set.has(k)) return false;
      set.add(k);
      return true;
    },
    remove: (k) => set.delete(k),
    list: () => Array.from(set)
  };
}

/** Paredes (não portas) nas 4 arestas da célula no `wallLayer`. */
export function hasFourWalls(occ, ix, iz, wallLayer) {
  if (!occ) return false;
  const edges = ['N', 'E', 'S', 'W'];
  for (let i = 0; i < edges.length; i++) {
    if (!occ.has(wallKey(ix, iz, wallLayer, edges[i]))) return false;
  }
  return true;
}

export function canPlaceFloor(occ, ix, iz, layer) {
  return placeBlockReason(occ, 'floor', ix, iz, layer) == null;
}

export function wallHasAdjacentFloor(occ, canon) {
  const L = canon.layer;
  if (canon.edge === 'E') {
    return occ.has(floorKey(canon.ix, canon.iz, L)) || occ.has(floorKey(canon.ix + 1, canon.iz, L));
  }
  return occ.has(floorKey(canon.ix, canon.iz, L)) || occ.has(floorKey(canon.ix, canon.iz + 1, L));
}

export function snapWallEdge(x, z, ix, iz) {
  const dx = x - ix;
  const dz = z - iz;
  if (Math.abs(dx) > Math.abs(dz)) return dx > 0 ? 'E' : 'W';
  return dz > 0 ? 'N' : 'S';
}

export function canPlaceWall(occ, ix, iz, layer, localEdge) {
  return placeBlockReason(occ, 'wall', ix, iz, layer, { edge: localEdge }) == null;
}

export function canPlaceDoor(occ, ix, iz, layer, localEdge) {
  return placeBlockReason(occ, 'door', ix, iz, layer, { edge: localEdge }) == null;
}

export function canPlaceStair(occ, ix, iz, layer, yaw) {
  return placeBlockReason(occ, 'stair', ix, iz, layer, { rot: yaw }) == null;
}

export function canPlaceFurn(occ, ix, iz, layer) {
  return placeBlockReason(occ, 'crate', ix, iz, layer) == null;
}

/**
 * Why a ghost is invalid. `null` = allowed.
 * Stair only needs origin floor (landing L+1 is built after, with 4 walls).
 */
export function placeBlockReason(occ, type, ix, iz, layer, extra = {}) {
  const L = Number(layer) || 0;
  if (type === 'floor') {
    if (occ.has(floorKey(ix, iz, L))) return 'occupied';
    if (L >= 1 && !hasFourWalls(occ, ix, iz, L - 1)) return 'need_walls';
    return null;
  }
  if (type === 'wall') {
    const canon = canonicalWall(ix, iz, L, extra.edge);
    if (occ.has(wallKey(canon.ix, canon.iz, canon.layer, canon.edge))) return 'occupied';
    if (occ.has(doorKey(canon.ix, canon.iz, canon.layer, canon.edge))) return 'occupied';
    if (!wallHasAdjacentFloor(occ, canon)) return 'need_floor';
    return null;
  }
  if (type === 'door') {
    const canon = canonicalWall(ix, iz, L, extra.edge);
    if (occ.has(doorKey(canon.ix, canon.iz, canon.layer, canon.edge))) return 'occupied';
    if (occ.has(wallKey(canon.ix, canon.iz, canon.layer, canon.edge))) return null;
    if (!wallHasAdjacentFloor(occ, canon)) return 'need_floor';
    return null;
  }
  if (type === 'stair') {
    if (occ.has(stairKey(ix, iz, L))) return 'occupied';
    if (!occ.has(floorKey(ix, iz, L))) return 'need_floor';
    return null;
  }
  if (type === 'crate' || type === 'bench') {
    if (occ.has(furnKey(ix, iz, L))) return 'occupied';
    if (!occ.has(floorKey(ix, iz, L))) return 'need_floor';
    return null;
  }
  return 'blocked';
}

export function occupancyKeyFor(type, ix, iz, layer, extra = {}) {
  if (type === 'floor') return floorKey(ix, iz, layer);
  if (type === 'wall') return wallKey(ix, iz, layer, extra.edge);
  if (type === 'door') return doorKey(ix, iz, layer, extra.edge);
  if (type === 'stair') return stairKey(ix, iz, layer);
  if (type === 'crate' || type === 'bench') return furnKey(ix, iz, layer);
  return floorKey(ix, iz, layer);
}
