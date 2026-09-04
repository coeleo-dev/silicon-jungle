import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tileIndex, tileKey, tileBounds, CITY_TILE_SIZE } from './cityTiles.js';

describe('cityTiles', () => {
  it('uses 40 m tiles', () => {
    assert.equal(CITY_TILE_SIZE, 40);
  });

  it('tileIndex floors toward -inf', () => {
    assert.deepEqual(tileIndex(0, 0), { tx: 0, tz: 0 });
    assert.deepEqual(tileIndex(39.9, 40), { tx: 0, tz: 1 });
    assert.deepEqual(tileIndex(-0.1, -40), { tx: -1, tz: -1 });
  });

  it('tileKey is tx:tz', () => {
    assert.equal(tileKey(50, 50), '1:1');
  });

  it('tileBounds is exclusive max on size', () => {
    assert.deepEqual(tileBounds(0, 0), { minX: 0, maxX: 40, minZ: 0, maxZ: 40 });
    assert.deepEqual(tileBounds(-1, 1), { minX: -40, maxX: 0, minZ: 40, maxZ: 80 });
  });
});
