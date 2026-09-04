import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shadowCasterMaxDistSq, shouldCastShadowAt } from './shadowPerf.js';

describe('shadowPerf', () => {
  it('shouldCastShadowAt respects max distance', () => {
    const maxSq = shadowCasterMaxDistSq();
    assert.equal(shouldCastShadowAt(maxSq - 1), true);
    assert.equal(shouldCastShadowAt(maxSq + 1), false);
  });
});
