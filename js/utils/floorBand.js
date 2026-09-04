/**
 * Faixa de altura dos pés para escolher piso/degrau.
 * Lances de escada compartilham o mesmo XZ em Y diferentes: sem esta faixa
 * o motor gruda no piso mais alto e o player não consegue descer.
 */
export const FLOOR_CATCH_BELOW = 0.25;
export const FLOOR_STEP_UP = 0.85;
export const BOX_STEP_UP = 0.50;
export const BOX_CATCH_BELOW = 0.85;

/** Laje type:'floor': só é chão se estiver perto dos pés. */
export function isSlabInFootBand(slabY, footY) {
  return slabY >= footY - FLOOR_CATCH_BELOW && slabY <= footY + FLOOR_STEP_UP;
}

/** Topo de caixa-degrau: auto-step para cima ou queda curta para baixo. */
export function isBoxTopWalkable(maxY, footY) {
  return maxY >= footY - BOX_CATCH_BELOW && maxY <= footY + BOX_STEP_UP;
}
