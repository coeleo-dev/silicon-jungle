import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldSpawnNightPatrol,
  shouldDespawnNightPatrol,
  pickNightPatrolAnchor
} from './nightPatrol.js';

describe('nightPatrol', () => {
  it('spawns only at night when none exists', () => {
    assert.equal(shouldSpawnNightPatrol({ isNightNow: true, hasExtra: false }), true);
    assert.equal(shouldSpawnNightPatrol({ isNightNow: true, hasExtra: true }), false);
    assert.equal(shouldSpawnNightPatrol({ isNightNow: false, hasExtra: false }), false);
  });

  it('despawns at dawn only if not in combat', () => {
    assert.equal(shouldDespawnNightPatrol({ isNightNow: false, inCombat: false }), true);
    assert.equal(shouldDespawnNightPatrol({ isNightNow: false, inCombat: true }), false);
    assert.equal(shouldDespawnNightPatrol({ isNightNow: true, inCombat: false }), false);
  });

  it('anchor is 40–60 m from origin', () => {
    const p = pickNightPatrolAnchor(() => 0.5);
    const d = Math.hypot(p.x, p.z);
    assert.ok(d >= 40 && d <= 60);
  });
});
