import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  resetStormMachine,
  stormStartChance,
  tickStormMachine,
  tickLightningBolt,
  strikeHitsPlayer,
  STORM_STRIKE_RADIUS
} from './stormWeather.js';

describe('stormWeather', () => {
  beforeEach(() => resetStormMachine());

  it('night start chance is higher than day', () => {
    assert.ok(stormStartChance(true) > stormStartChance(false));
  });

  it('starts a storm when rng is below chance', () => {
    const clock = { timeOfDay: 0.5, storm: false };
    tickStormMachine(8, clock, () => 0);
    assert.equal(clock.storm, true);
  });

  it('does not start when rng is 1', () => {
    const clock = { timeOfDay: 0.5, storm: false };
    tickStormMachine(8, clock, () => 1);
    assert.equal(clock.storm, false);
  });

  it('ends after duration', () => {
    const clock = { timeOfDay: 0.5, storm: false };
    tickStormMachine(8, clock, () => 0);
    assert.equal(clock.storm, true);
    tickStormMachine(40, clock, () => 0);
    assert.equal(clock.storm, false);
  });

  it('emits a bolt offset while storming', () => {
    resetStormMachine();
    const miss = tickLightningBolt(0.01, false, () => 0.5);
    assert.equal(miss, null);
    const hit = tickLightningBolt(10, true, () => 0.5);
    assert.ok(hit);
    assert.equal(typeof hit.ox, 'number');
    assert.equal(typeof hit.oz, 'number');
  });

  it('strikeHitsPlayer uses radius', () => {
    assert.equal(strikeHitsPlayer(0, 0, 0, 0, 10), true);
    assert.equal(strikeHitsPlayer(0, 0, 20, 0, STORM_STRIKE_RADIUS), false);
  });
});
