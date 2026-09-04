/**
 * Colocação de spawn: busca anel polar + fallback.
 * Nunca devolve o ponto original se ele estiver sólido.
 */

export function isSpawnClear(x, z, radius, { isZoneFree, isSolidBlocked } = {}) {
  if (typeof isZoneFree === 'function' && !isZoneFree(x, z, radius)) return false;
  if (typeof isSolidBlocked === 'function' && isSolidBlocked(x, z, radius)) return false;
  return true;
}

function searchRings(originX, originZ, radius, maxDistance, ringStep, isClear) {
  for (let r = ringStep; r <= maxDistance + 1e-6; r += ringStep) {
    const steps = Math.max(8, Math.ceil((Math.PI * 2 * r) / 2.4));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = originX + Math.cos(a) * r;
      const z = originZ + Math.sin(a) * r;
      if (isClear(x, z, radius)) {
        return { x, z };
      }
    }
  }
  return null;
}

/**
 * @param {number} targetX
 * @param {number} targetZ
 * @param {object} opts
 * @param {number} [opts.radius=0.7]
 * @param {number} [opts.maxDistance=36]
 * @param {number} [opts.ringStep=1.25]
 * @param {(x:number,z:number,r:number)=>boolean} opts.isClear
 * @param {{x:number,z:number}} [opts.fallback]
 * @returns {{ x: number, z: number, relocated: boolean }}
 */
export function findClearSpawn(targetX, targetZ, opts = {}) {
  const radius = opts.radius ?? 0.7;
  const maxDistance = opts.maxDistance ?? 36;
  const ringStep = opts.ringStep ?? 1.25;
  const isClear = opts.isClear;
  const fallback = opts.fallback ?? { x: 0, z: 18 };

  if (typeof isClear !== 'function') {
    return { x: targetX, z: targetZ, relocated: false };
  }

  if (isClear(targetX, targetZ, radius)) {
    return { x: targetX, z: targetZ, relocated: false };
  }

  const near = searchRings(targetX, targetZ, radius, maxDistance, ringStep, isClear);
  if (near) return { x: near.x, z: near.z, relocated: true };

  if (isClear(fallback.x, fallback.z, radius)) {
    return { x: fallback.x, z: fallback.z, relocated: true };
  }

  const aroundFallback = searchRings(fallback.x, fallback.z, radius, maxDistance, ringStep, isClear);
  if (aroundFallback) return { x: aroundFallback.x, z: aroundFallback.z, relocated: true };

  return { x: fallback.x, z: fallback.z, relocated: true };
}
