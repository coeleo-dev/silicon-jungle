import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { pickNearestStreetLightIndices, MAX_ACTIVE_STREET_LIGHTS } from './streetLightPool.js';

describe('pickNearestStreetLightIndices', () => {
  it('caps active lights at 4', () => {
    assert.equal(MAX_ACTIVE_STREET_LIGHTS, 4);
    const positions = [];
    for (let i = 0; i < 12; i++) positions.push({ x: i * 10, z: 0 });
    const picked = pickNearestStreetLightIndices(positions, { x: 0, z: 0 });
    assert.equal(picked.length, 4);
    assert.deepEqual([...picked].sort((a, b) => a - b), [0, 1, 2, 3]);
  });

  it('picks the four closest to the camera, not the first in the list', () => {
    const positions = [
      { x: 100, z: 0 },
      { x: 5, z: 0 },
      { x: 80, z: 0 },
      { x: 8, z: 0 },
      { x: 90, z: 0 },
      { x: 12, z: 0 },
      { x: 70, z: 0 }
    ];
    const picked = pickNearestStreetLightIndices(positions, { x: 0, z: 0 });
    assert.deepEqual([...picked].sort((a, b) => a - b), [1, 3, 5, 6]);
  });

  it('enables the first N lights when camera is missing', () => {
    const positions = [{ x: 0, z: 0 }, { x: 1, z: 0 }, { x: 2, z: 0 }, { x: 3, z: 0 }, { x: 4, z: 0 }];
    assert.deepEqual(pickNearestStreetLightIndices(positions, null), [0, 1, 2, 3]);
  });

  it('returns every light when there are fewer than the cap', () => {
    const positions = [{ x: 0, z: 0 }, { x: 10, z: 0 }];
    assert.deepEqual(pickNearestStreetLightIndices(positions, { x: 0, z: 0 }), [0, 1]);
  });
});
