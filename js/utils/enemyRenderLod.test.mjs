import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveEnemyRenderLod } from './enemyRenderLod.js';

describe('resolveEnemyRenderLod', () => {
  it('keeps full model under 50 m', () => {
    assert.deepEqual(resolveEnemyRenderLod(49 * 49), {
      groupVisible: true,
      limbsVisible: true
    });
  });

  it('hides limbs between 50 m and 120 m', () => {
    assert.deepEqual(resolveEnemyRenderLod(50 * 50), {
      groupVisible: true,
      limbsVisible: false
    });
    assert.deepEqual(resolveEnemyRenderLod(120 * 120), {
      groupVisible: true,
      limbsVisible: false
    });
  });

  it('hides the whole enemy beyond 120 m', () => {
    assert.deepEqual(resolveEnemyRenderLod(120 * 120 + 1), {
      groupVisible: false,
      limbsVisible: false
    });
  });
});
