/**
 * LOD de render de inimigos: fog some o modelo; médio deixa só o volume do corpo.
 */
export const ENEMY_RENDER_HIDE_DIST_SQ = 120 * 120;
export const ENEMY_RENDER_FULL_DIST_SQ = 50 * 50;

export function resolveEnemyRenderLod(distSq) {
  if (distSq > ENEMY_RENDER_HIDE_DIST_SQ) {
    return { groupVisible: false, limbsVisible: false };
  }
  return {
    groupVisible: true,
    limbsVisible: distSq < ENEMY_RENDER_FULL_DIST_SQ
  };
}
