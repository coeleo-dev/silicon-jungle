import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSectorAt, SECTOR_IDS, SECTOR_CENTERS } from './sectors.js';

describe('getSectorAt', () => {
  it('maps sector centers from the spec table', () => {
    assert.equal(getSectorAt(0, 0), 'marco_zero');
    assert.equal(getSectorAt(-80, 80), 'south_atx');
    assert.equal(getSectorAt(80, 80), 'east_dimm');
    assert.equal(getSectorAt(-80, -80), 'west_io');
    assert.equal(getSectorAt(70, -70), 'north_heatsink');
  });

  it('exports the five bus ids with documented centers', () => {
    assert.deepEqual(
      [...SECTOR_IDS].sort(),
      ['east_dimm', 'marco_zero', 'north_heatsink', 'south_atx', 'west_io']
    );
    const byId = Object.fromEntries(SECTOR_CENTERS.map((c) => [c.id, c]));
    assert.deepEqual({ x: byId.marco_zero.x, z: byId.marco_zero.z }, { x: 0, z: 0 });
    assert.deepEqual({ x: byId.south_atx.x, z: byId.south_atx.z }, { x: -80, z: 80 });
    assert.deepEqual({ x: byId.east_dimm.x, z: byId.east_dimm.z }, { x: 80, z: 80 });
    assert.deepEqual({ x: byId.west_io.x, z: byId.west_io.z }, { x: -80, z: -80 });
    assert.deepEqual({ x: byId.north_heatsink.x, z: byId.north_heatsink.z }, { x: 70, z: -70 });
  });
});
