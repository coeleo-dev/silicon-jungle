/**
 * Pressão noturna leve (P25) — regras puras.
 */

export function shouldSpawnNightPatrol({ isNightNow, hasExtra }) {
  return !!isNightNow && !hasExtra;
}

export function shouldDespawnNightPatrol({ isNightNow, inCombat }) {
  return !isNightNow && !inCombat;
}

export function pickNightPatrolAnchor(rng = Math.random) {
  const dist = 40 + rng() * 20;
  const ang = rng() * Math.PI * 2;
  return { x: Math.cos(ang) * dist, z: Math.sin(ang) * dist };
}

export function isNightCombat(entity) {
  if (!entity || entity.isDead) return false;
  return entity.state === 'CHASE' || entity.state === 'STUNNED';
}
