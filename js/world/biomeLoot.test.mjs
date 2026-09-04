import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { exclusiveResource, EXCLUSIVE_RESOURCE } from './biomeLoot.js';

describe('biomeLoot', () => {
  it('planície não tem chave P05 exclusiva', () => {
    assert.equal(exclusiveResource('circuit_plain'), null);
  });

  it('os outros 5 biomas têm recursos distintos', () => {
    const ids = ['smd_metro', 'thermal_swamp', 'atx_wastes', 'capacitor_caves', 'cooler_vortex'];
    const keys = ids.map(exclusiveResource);
    assert.equal(new Set(keys).size, 5);
    assert.ok(keys.every((k) => typeof k === 'string'));
    assert.equal(exclusiveResource('smd_metro'), EXCLUSIVE_RESOURCE.smd_metro);
  });
});
