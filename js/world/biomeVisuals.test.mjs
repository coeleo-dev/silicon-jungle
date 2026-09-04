import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { terrainKindForBiome, vegDensityScale, fogForBiome, moveModifiers } from './biomeVisuals.js';

describe('biomeVisuals', () => {
  it('planície usa trilhos; metro usa urbano', () => {
    assert.equal(terrainKindForBiome('circuit_plain'), 'trails');
    assert.equal(terrainKindForBiome('smd_metro'), 'urban');
    assert.equal(terrainKindForBiome('unknown'), undefined);
  });

  it('metro e cavernas rarefazem veg; planície adensa grama', () => {
    assert.ok(vegDensityScale('circuit_plain', 'plains_grass') > 1);
    assert.ok(vegDensityScale('smd_metro') < 1);
    assert.ok(vegDensityScale('capacitor_caves') < 0.2);
    assert.equal(vegDensityScale('nope'), 1);
  });

  it('pântano abranda; vórtice empurra', () => {
    assert.ok(moveModifiers('thermal_swamp').speedMul < 1);
    assert.ok(moveModifiers('cooler_vortex').windX !== 0 || moveModifiers('cooler_vortex').windZ !== 0);
    assert.equal(moveModifiers('circuit_plain').speedMul, 1);
  });

  it('pântano tem fog mais curto que a planície', () => {
    assert.ok(fogForBiome('thermal_swamp').far < fogForBiome('circuit_plain').far);
  });
});
