import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getBiomeAt, BIOME_IDS } from './biomeMap.js';

describe('getBiomeAt', () => {
  it('maps landmarks to spec biome ids', () => {
    assert.equal(getBiomeAt(0, 0), 'circuit_plain');
    assert.equal(getBiomeAt(-80, 80), 'atx_wastes');
    assert.equal(getBiomeAt(80, 80), 'smd_metro');
    assert.equal(getBiomeAt(-90, -20), 'capacitor_caves');
    assert.equal(getBiomeAt(-70, 70), 'thermal_swamp');
    assert.equal(getBiomeAt(0, -270), 'cooler_vortex');
    assert.equal(getBiomeAt(0, -140), 'circuit_plain');
  });

  it('exports the six spec ids', () => {
    assert.deepEqual(
      [...BIOME_IDS].sort(),
      ['atx_wastes', 'capacitor_caves', 'circuit_plain', 'cooler_vortex', 'smd_metro', 'thermal_swamp']
    );
  });
});
