/**
 * Testes puros de linha de visão (sem Three.js / spatial grid).
 * Usado por hasLineOfSight e pela AABB rotacionada de veículos.
 */

const END_EPS = 0.1;
const FLOOR_SLAB = 0.2;

function hypot3(dx, dy, dz) {
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function cylinderCenterXZ(col) {
  const c = col.center;
  if (c.x !== undefined) {
    return { cx: c.x, cz: c.z !== undefined ? c.z : c[2], cy: c.y };
  }
  return { cx: c[0], cz: c[2], cy: c[1] };
}

/**
 * Segmento p1→p2 vs AABB. Origem dentro da caixa não bloqueia (muzzle no vão).
 */
export function segmentHitsAabb(p1, p2, minX, minY, minZ, maxX, maxY, maxZ) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const dist = hypot3(dx, dy, dz);
  if (dist < 1e-8) return false;

  const tEnd = 1 - Math.min(END_EPS / dist, 0.99);
  let tmin = 0;
  let tmax = tEnd;

  const slab = (p0, d, min, max) => {
    if (Math.abs(d) < 1e-12) {
      return p0 >= min && p0 <= max;
    }
    let t1 = (min - p0) / d;
    let t2 = (max - p0) / d;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    return tmin <= tmax;
  };

  if (!slab(p1.x, dx, minX, maxX)) return false;
  if (!slab(p1.y, dy, minY, maxY)) return false;
  if (!slab(p1.z, dz, minZ, maxZ)) return false;
  return tmin <= tmax;
}

/**
 * Segmento vs cilindro vertical. Sem minY/maxY = infinito (troncos/postes).
 * Origem dentro do volume não bloqueia.
 */
export function segmentHitsCylinder(p1, p2, cx, cz, radius, minY, maxY) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dz = p2.z - p1.z;
  const dist = hypot3(dx, dy, dz);
  if (dist < 1e-8) return false;

  const fx = p1.x - cx;
  const fz = p1.z - cz;
  const r2 = radius * radius;
  const insideXZ = fx * fx + fz * fz < r2;
  const finite = minY != null && maxY != null;

  const tEnd = 1 - Math.min(END_EPS / dist, 0.99);
  const a = dx * dx + dz * dz;

  if (a < 1e-12) {
    if (!insideXZ) return false;
    if (!finite) return false;
    const lo = Math.min(p1.y, p2.y);
    const hi = Math.max(p1.y, p2.y);
    return hi >= minY && lo <= maxY;
  }

  const b = 2 * (fx * dx + fz * dz);
  const c = fx * fx + fz * fz - r2;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return false;

  const sqrtD = Math.sqrt(disc);
  const inv2a = 0.5 / a;
  let t1 = (-b - sqrtD) * inv2a;
  let t2 = (-b + sqrtD) * inv2a;
  if (t1 > t2) {
    const tmp = t1;
    t1 = t2;
    t2 = tmp;
  }

  const tEnter = Math.max(t1, 0);
  const tLeave = Math.min(t2, tEnd);
  if (tEnter > tLeave) return false;
  if (!finite) return true;

  const yEnter = p1.y + tEnter * dy;
  const yLeave = p1.y + tLeave * dy;
  if (yEnter >= minY && yEnter <= maxY) return true;
  if (yLeave >= minY && yLeave <= maxY) return true;
  if (Math.abs(dy) < 1e-12) return false;

  const tLo = (minY - p1.y) / dy;
  const tHi = (maxY - p1.y) / dy;
  return (tLo >= tEnter && tLo <= tLeave) || (tHi >= tEnter && tHi <= tLeave);
}

export function colliderBlocksSegment(p1, p2, col) {
  if (!col) return false;

  if (col.type === 'box') {
    const b = col.box;
    return segmentHitsAabb(p1, p2, b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z);
  }

  if (col.type === 'cylinder') {
    const { cx, cz, cy } = cylinderCenterXZ(col);
    if (col.height != null && cy != null) {
      const half = col.height / 2;
      return segmentHitsCylinder(p1, p2, cx, cz, col.radius, cy - half, cy + half);
    }
    return segmentHitsCylinder(p1, p2, cx, cz, col.radius);
  }

  if (col.type === 'floor') {
    return segmentHitsAabb(
      p1, p2,
      col.minX, col.y - FLOOR_SLAB, col.minZ,
      col.maxX, col.y + FLOOR_SLAB, col.maxZ
    );
  }

  return false;
}

export function isLineOfSightClear(p1, p2, colliders) {
  if (!colliders || colliders.length === 0) return true;
  for (let i = 0; i < colliders.length; i++) {
    if (colliderBlocksSegment(p1, p2, colliders[i])) return false;
  }
  return true;
}

/**
 * AABB axis-aligned da footprint retangular após yaw (Y), para carros rotacionados.
 */
export function aabbFromYawFootprint({ x, z, y, halfW, halfL, height, yaw, pad = 0 }) {
  const hw = halfW + pad;
  const hl = halfL + pad;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  const corners = [[-hw, -hl], [hw, -hl], [hw, hl], [-hw, hl]];
  for (let i = 0; i < 4; i++) {
    const lx = corners[i][0];
    const lz = corners[i][1];
    const wx = x + lx * c - lz * s;
    const wz = z + lx * s + lz * c;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wz < minZ) minZ = wz;
    if (wz > maxZ) maxZ = wz;
  }
  return {
    min: { x: minX, y, z: minZ },
    max: { x: maxX, y: y + height, z: maxZ }
  };
}
