import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  worldClock,
  tickWorldClock,
  isNight,
  applyWorldClock,
  snapshotWorldClock,
  resetWorldClock,
  skySample,
  applyTodFog,
  sunDirection
} from './worldClock.js';

function luma(hex) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const dir = dirname(fileURLToPath(import.meta.url));

describe('worldClock', () => {
  beforeEach(() => {
    resetWorldClock();
  });

  it('starts at midnight (0) with no storm', () => {
    assert.equal(worldClock.timeOfDay, 0);
    assert.equal(worldClock.storm, false);
  });

  it('does not advance when paused', () => {
    tickWorldClock(10, { paused: true, cycleSeconds: 180 });
    assert.equal(worldClock.timeOfDay, 0);
  });

  it('wraps a full cycle in cycleSeconds', () => {
    tickWorldClock(180, { paused: false, cycleSeconds: 180 });
    assert.ok(Math.abs(worldClock.timeOfDay - 0) < 1e-9);
  });

  it('advances 0.5 in half a cycle', () => {
    tickWorldClock(90, { paused: false, cycleSeconds: 180 });
    assert.ok(Math.abs(worldClock.timeOfDay - 0.5) < 1e-9);
  });

  it('isNight at midnight and not at noon', () => {
    assert.equal(isNight(0), true);
    assert.equal(isNight(0.1), true);
    assert.equal(isNight(0.25), false);
    assert.equal(isNight(0.5), false);
    assert.equal(isNight(0.85), true);
  });

  it('apply/snapshot roundtrip', () => {
    applyWorldClock({ timeOfDay: 0.42, storm: true });
    assert.deepEqual(snapshotWorldClock(), { timeOfDay: 0.42, storm: true });
  });

  it('skySample: noon is day, midnight is night fog', () => {
    const noon = skySample(0.5);
    const mid = skySample(0);
    assert.ok(noon.day > 0.9);
    assert.ok(mid.night > 0.9);
    assert.ok(mid.fogFarMul < noon.fogFarMul);
    assert.ok(mid.bioOpacity > noon.bioOpacity);
  });

  it('applyTodFog shortens far at midnight', () => {
    const biome = { color: 0x0c2438, near: 38, far: 165 };
    const night = applyTodFog(biome, 0);
    const day = applyTodFog(biome, 0.5);
    assert.ok(night.far < day.far);
  });

  it('applyTodFog day haze is brighter than biome; night is darker', () => {
    const biome = { color: 0x0c2438, near: 38, far: 165 };
    const night = applyTodFog(biome, 0);
    const day = applyTodFog(biome, 0.5);
    assert.ok(luma(day.color) > luma(biome.color));
    assert.ok(luma(night.color) < luma(biome.color));
  });

  it('sunDirection: dawn on horizon, noon up, midnight below', () => {
    const dawn = sunDirection(0.25);
    const noon = sunDirection(0.5);
    const mid = sunDirection(0);
    assert.ok(Math.abs(dawn.y) < 0.2, `dawn y=${dawn.y}`);
    assert.ok(noon.y > 0.7, `noon y=${noon.y}`);
    assert.ok(mid.y < -0.5, `midnight y=${mid.y}`);
  });
});

describe('P22 sky wiring', () => {
  it('lighting paints scene.background and a visible sun disc', () => {
    const src = readFileSync(join(dir, '../core/lighting.js'), 'utf8');
    assert.match(src, /scene\.background/);
    assert.match(src, /SKY_DAY_COLOR/);
    assert.match(src, /sunDisc/);
    assert.match(src, /fog:\s*false/);
  });
});

describe('P21 save wiring', () => {
  it('saveSystem snapshots live worldClock instead of wiping the envelope', () => {
    const src = readFileSync(join(dir, '../core/saveSystem.js'), 'utf8');
    assert.match(src, /snapshotWorldClock/);
    assert.match(src, /applyWorldClock/);
  });
});
