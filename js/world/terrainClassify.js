/**
 * Classificação de material por chunk (AABB vs disco).
 * Extraído para testes Node sem THREE.
 */

export const URBAN_RADIUS = 50;
export const TRAIL_RADIUS = 95;

/**
 * Distância da origem (0,0) ao ponto mais próximo do AABB no plano XZ.
 */
export function aabbClosestDistToOrigin(minX, maxX, minZ, maxZ) {
  const cx = Math.max(minX, Math.min(0, maxX));
  const cz = Math.max(minZ, Math.min(0, maxZ));
  return Math.hypot(cx, cz);
}

export function aabbHitsDisk(minX, maxX, minZ, maxZ, radius) {
  return aabbClosestDistToOrigin(minX, maxX, minZ, maxZ) < radius;
}

/**
 * @returns {'mountain_cliff'|'mountain_slope'|'urban'|'trails'|'jungle'}
 */
export function classifyTerrainChunk({ startX, startZ, chunkSize, dist, maxH }) {
  if (dist > 155 || maxH > 14) return 'mountain_cliff';
  if (dist > 130 && maxH > 8) return 'mountain_slope';

  const minX = startX;
  const maxX = startX + chunkSize;
  const minZ = startZ;
  const maxZ = startZ + chunkSize;

  if (aabbHitsDisk(minX, maxX, minZ, maxZ, URBAN_RADIUS)) return 'urban';
  if (aabbHitsDisk(minX, maxX, minZ, maxZ, TRAIL_RADIUS)) return 'trails';
  return 'jungle';
}

/**
 * Chave em TOON_MATERIALS. C1: lotes urbanos = concreto/ruína.
 * Tiles074 (TILES_PCB_STREET) é xadrez de cerâmica — nunca no terreno.
 */
export function materialIdForKind(kind) {
  if (kind === 'mountain_cliff') return 'ROCK_DARK_CLIFF';
  if (kind === 'mountain_slope') return 'ROCK_MOUNTAIN';
  if (kind === 'urban') return 'CONCRETE_BUNKER';
  if (kind === 'trails') return 'GROUND_TRAILS';
  return 'GROUND_JUNGLE';
}
