/**
 * Wander de standby do companheiro: anel ao redor do jogador, catch-up e pausa.
 */

export const CATCH_UP_DIST = 5.5;
export const WANDER_MIN_R = 2.0;
export const WANDER_MAX_R = 4.2;
export const WANDER_ARRIVE_DIST = 0.45;
export const WANDER_PAUSE_MIN = 0.5;
export const WANDER_PAUSE_MAX = 1.8;
export const WANDER_SPEED_SCALE = 0.55;

/**
 * @param {number} playerX
 * @param {number} playerZ
 * @param {number} minR
 * @param {number} maxR
 * @param {() => number} rng  valores em [0, 1)
 * @returns {{ x: number, z: number }}
 */
export function pickCompanionWanderPoint(playerX, playerZ, minR, maxR, rng = Math.random) {
  const angle = rng() * Math.PI * 2;
  const r = minR + rng() * (maxR - minR);
  return {
    x: playerX + Math.sin(angle) * r,
    z: playerZ + Math.cos(angle) * r
  };
}

export function shouldCatchUp(distToPlayer, catchUpDist = CATCH_UP_DIST) {
  return distToPlayer > catchUpDist;
}

export function shouldPickNewWander(arrived, pauseLeft) {
  return arrived && pauseLeft <= 0;
}

export function pickWanderPause(rng = Math.random) {
  return WANDER_PAUSE_MIN + rng() * (WANDER_PAUSE_MAX - WANDER_PAUSE_MIN);
}
