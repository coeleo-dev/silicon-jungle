/**
 * Padrões de combate do Sentinel: rajada variável e strafe no médio alcance.
 */

export function pickBurstPattern(rng = Math.random) {
  const roll = rng();
  if (roll < 0.35) {
    return { shots: 2, interval: 0.22, windup: 0.5, name: 'double' };
  }
  if (roll < 0.70) {
    return { shots: 3, interval: 0.28, windup: 0.7, name: 'triple' };
  }
  return { shots: 4, interval: 0.18, windup: 0.9, name: 'quad' };
}

/**
 * Deslocamento lateral (m/s) — só no médio alcance, para não kitar nem recuar.
 */
export function strafeOffset(time, dist) {
  if (dist < 8 || dist > 18) return 0;
  return Math.sin(time * 1.4) * 2.2;
}
