import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickCompanionWanderPoint,
  shouldCatchUp,
  shouldPickNewWander
} from './companionWander.js';

describe('pickCompanionWanderPoint', () => {
  it('places the point on the ring around the player', () => {
    const rng = (() => {
      const seq = [0.25, 0];
      let i = 0;
      return () => seq[i++];
    })();
    const p = pickCompanionWanderPoint(10, 20, 2, 4.2, rng);
    const dist = Math.hypot(p.x - 10, p.z - 20);
    assert.ok(dist >= 2 - 1e-9 && dist <= 4.2 + 1e-9);
    assert.equal(dist, 2);
  });
});

describe('shouldCatchUp', () => {
  it('is false at or under the catch-up distance', () => {
    assert.equal(shouldCatchUp(5.5, 5.5), false);
    assert.equal(shouldCatchUp(3, 5.5), false);
  });

  it('is true only above the catch-up distance', () => {
    assert.equal(shouldCatchUp(5.51, 5.5), true);
  });
});

describe('shouldPickNewWander', () => {
  it('does not retarget during a pause even if arrived', () => {
    assert.equal(shouldPickNewWander(true, 0.4), false);
  });

  it('retargets only after arriving and pause elapsed', () => {
    assert.equal(shouldPickNewWander(true, 0), true);
    assert.equal(shouldPickNewWander(false, 0), false);
  });
});
