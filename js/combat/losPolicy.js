/**
 * Regras de combate do Bug 5: disparo e estado só com linha de visão.
 */

export function resolveCombatState({ canSeePlayer, dist, aggroRange, leashRange, current }) {
  if (canSeePlayer && dist < aggroRange) return 'COMBAT';
  if (dist > leashRange || !canSeePlayer) return 'PATROL';
  return current;
}

export function shouldFireWeb({ hasLos, dist, minRange = 6, maxRange = 24 }) {
  return hasLos && dist > minRange && dist < maxRange;
}

export function enemyProjectileOutcome({ playerHit, losToPlayer, losAlongStep }) {
  if (playerHit && losToPlayer) return 'hitPlayer';
  if (!losAlongStep) return 'hitWorld';
  return 'fly';
}
