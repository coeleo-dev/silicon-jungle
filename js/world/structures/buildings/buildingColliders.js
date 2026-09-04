/**
 * Colisores locais de lote: fundação enterrada com vão de porta,
 * volume de doorway e degraus do IOComplex.
 */

export const FOUNDATION_DEPTH = 7.5;
export const FOUNDATION_PAD = 0.4;
export const FOUNDATION_THICK = 0.55;

/**
 * Perímetro da fundação (minY negativo) + plinto da entrada.
 * Face sul aberta em ±doorW/2 para o player não bater na caixa enterrada.
 */
export function foundationColliders({
  width,
  depth,
  doorW,
  pad = FOUNDATION_PAD,
  minY = -FOUNDATION_DEPTH,
  maxY = 0
}) {
  const hw = width / 2 + pad;
  const hd = depth / 2 + pad;
  const t = FOUNDATION_THICK;
  const halfDoor = doorW / 2;

  return [
    { minX: -hw, maxX: hw, minZ: -hd, maxZ: -hd + t, minY, maxY },
    { minX: hw - t, maxX: hw, minZ: -hd, maxZ: hd, minY, maxY },
    { minX: -hw, maxX: -hw + t, minZ: -hd, maxZ: hd, minY, maxY },
    { minX: -hw, maxX: -halfDoor, minZ: hd - t, maxZ: hd, minY, maxY },
    { minX: halfDoor, maxX: hw, minZ: hd - t, maxZ: hd, minY, maxY },
    {
      minX: -width / 2 + 0.3,
      maxX: width / 2 - 0.3,
      minZ: -depth / 2 + 0.3,
      maxZ: depth / 2 - 1.2,
      minY,
      maxY
    },
    {
      minX: -(halfDoor + 1.3),
      maxX: halfDoor + 1.3,
      minZ: depth / 2 - 0.2,
      maxZ: depth / 2 + 2.8,
      minY: -4,
      maxY: 0.2
    }
  ];
}

/**
 * Volume OBB local do vão: da lintel até o patamar externo.
 */
export function doorwayVolume({
  depth,
  doorW,
  doorH,
  inside = 1.5,
  outside = 3.6
}) {
  return {
    minX: -doorW / 2,
    maxX: doorW / 2,
    minZ: depth / 2 - inside,
    maxZ: depth / 2 + outside,
    minY: -0.5,
    maxY: doorH
  };
}

export function isInsideDoorway(px, py, pz, door) {
  return px >= door.minX && px <= door.maxX &&
    pz >= door.minZ && pz <= door.maxZ &&
    py >= door.minY && py <= door.maxY;
}

/**
 * No vão da porta, paredes altas (e fundação) não bloqueiam.
 * Degraus baixos continuam sólidos para o auto-step.
 */
export function shouldSkipWallInDoorway(inDoorway, boxMinY, boxMaxY, footY) {
  if (!inDoorway) return false;
  const stepDelta = boxMaxY - footY;
  if (stepDelta >= -0.2 && stepDelta <= 0.50) return false;
  if (boxMaxY <= footY + 0.50 && boxMaxY >= footY - 0.85) return false;
  return true;
}

/**
 * 12 degraus da escada interna do IOComplex (coordenadas mundo).
 * Mesh: Box 3.5×0.4×0.9 em (-11, 0.6+i*0.58, -6+i*0.9) relativo ao grupo.
 */
export function ioComplexStepBoxes(worldX, worldY, worldZ, count = 12) {
  const steps = [];
  for (let i = 0; i < count; i++) {
    const cx = worldX - 11;
    const cy = worldY + 0.6 + i * 0.58;
    const cz = worldZ - 6 + i * 0.9;
    steps.push({
      minX: cx - 1.75,
      maxX: cx + 1.75,
      minY: cy - 0.2,
      maxY: cy + 0.2,
      minZ: cz - 0.45,
      maxZ: cz + 0.45,
      floorY: cy + 0.2
    });
  }
  return steps;
}

/**
 * AABB mundo a partir de AABB local. sinR deve ser -sin(rot) (mesmo que CityLayoutManager / THREE.rotateY).
 */
export function worldAabbFromLocal(local, originX, originZ, originY, cosR, sinR) {
  const corners = [
    [local.minX, local.minZ],
    [local.minX, local.maxZ],
    [local.maxX, local.minZ],
    [local.maxX, local.maxZ]
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < 4; i++) {
    const lx = corners[i][0];
    const lz = corners[i][1];
    const wx = originX + lx * cosR - lz * sinR;
    const wz = originZ + lx * sinR + lz * cosR;
    if (wx < minX) minX = wx;
    if (wx > maxX) maxX = wx;
    if (wz < minZ) minZ = wz;
    if (wz > maxZ) maxZ = wz;
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    minY: originY + (local.minY !== undefined ? local.minY : 0),
    maxY: originY + (local.maxY !== undefined ? local.maxY : 0)
  };
}
