import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isBehindCamera } from './cameraCull.js';

describe('isBehindCamera', () => {
  it('keeps instances at the player feet even if slightly behind', () => {
    assert.equal(isBehindCamera(0, -5, 0, 1, 25), false);
  });

  it('culls far instances behind forward +Z', () => {
    assert.equal(isBehindCamera(0, -40, 0, 1, 1600), true);
  });

  it('keeps instances in front', () => {
    assert.equal(isBehindCamera(0, 40, 0, 1, 1600), false);
  });
});
