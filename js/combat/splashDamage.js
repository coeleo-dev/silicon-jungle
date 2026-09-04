/**
 * Dano em área no impacto de plasma. Sem THREE.
 * entities: [{ id, x, z, isDead }]
 */
export function splashVictims(primaryId, hitX, hitZ, entities, radius, primaryDamage) {
  if (!radius || radius <= 0) return [];
  const hits = [];
  for (let i = 0; i < entities.length; i++) {
    const e = entities[i];
    if (!e || e.isDead || e.id === primaryId) continue;
    const dx = e.x - hitX;
    const dz = e.z - hitZ;
    const dist = Math.hypot(dx, dz);
    if (dist <= radius) {
      const falloff = 1 - dist / radius;
      const damage = Math.max(1, Math.round(primaryDamage * 0.55 * falloff));
      hits.push({ id: e.id, damage, dist });
    }
  }
  return hits;
}
