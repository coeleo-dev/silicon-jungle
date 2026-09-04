/**
 * Resolve spawn no mundo: exclusão 2D + colisores físicos (caixa/cilindro).
 * Usado por player, NPCs, SpiderBots, Sentinels e Capdog.
 */
import { spatialExclusionService } from '../core/SpatialExclusionService.js?v=20260821';
import { worldService } from '../core/WorldService.js?v=20260821';
import { findClearSpawn } from './spawnPlacement.js?v=20260821';

const PLAZA_FALLBACK = { x: 0, z: 18 };
const _probe = { x: 0, y: 0, z: 0 };

const OUTDOOR_IGNORE = ['ROAD', 'SIDEWALK'];

function makeIsClear(ignoredCategories) {
  return (x, z, radius) => {
    if (!spatialExclusionService.isAvailable(x, z, radius, ignoredCategories)) {
      return false;
    }
    const y = worldService.getHeight(x, z);
    _probe.x = x;
    _probe.y = y + 0.2;
    _probe.z = z;
    return !worldService.checkEntityCollision(_probe, radius + 0.2);
  };
}

/**
 * @param {number} x
 * @param {number} z
 * @param {number} [radius=0.7]
 * @param {object} [opts]
 * @param {string[]} [opts.ignoreCategories]
 * @param {number} [opts.maxDistance]
 * @param {{x:number,z:number}} [opts.fallback]
 */
export function resolveEntitySpawn(x, z, radius = 0.7, opts = {}) {
  const ignored = opts.ignoreCategories || OUTDOOR_IGNORE;
  const found = findClearSpawn(x, z, {
    radius,
    maxDistance: opts.maxDistance ?? 36,
    ringStep: opts.ringStep ?? 1.25,
    isClear: makeIsClear(ignored),
    fallback: opts.fallback || PLAZA_FALLBACK
  });
  const y = worldService.getHeight(found.x, found.z);
  return { x: found.x, y, z: found.z, relocated: found.relocated };
}

export function resolvePlayerSpawn(x, z) {
  return resolveEntitySpawn(x, z, 0.5, {
    ignoreCategories: ['ROAD', 'SIDEWALK', 'SAFE_ZONE'],
    maxDistance: 40,
    fallback: PLAZA_FALLBACK
  });
}
