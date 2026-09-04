import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SurvivalService } from './SurvivalService.js';

const dir = dirname(fileURLToPath(import.meta.url));

describe('SurvivalService', () => {
  it('starts at 100/100 and not game over', () => {
    const s = new SurvivalService();
    assert.equal(s.dataEnergy, 100);
    assert.equal(s.circuitIntegrity, 100);
    assert.equal(s.isGameOver, false);
    assert.equal(s.isOverclockActive, false);
  });

  it('clamps energy and consumeEnergy fails when empty', () => {
    const s = new SurvivalService();
    s.setDataEnergy(150);
    assert.equal(s.dataEnergy, 100);
    s.setDataEnergy(5);
    assert.equal(s.consumeEnergy(10), false);
    assert.equal(s.dataEnergy, 5);
    assert.equal(s.consumeEnergy(5), true);
    assert.equal(s.dataEnergy, 0);
  });

  it('takeDamage reduces integrity and trips game over at 0', () => {
    let over = 0;
    const s = new SurvivalService({ onGameOver: () => { over += 1; } });
    s.takeDamage(40);
    assert.equal(s.circuitIntegrity, 60);
    assert.equal(s.isGameOver, false);
    s.takeDamage(60);
    assert.equal(s.circuitIntegrity, 0);
    assert.equal(s.isGameOver, true);
    assert.equal(over, 1);
    s.takeDamage(10);
    assert.equal(over, 1);
  });

  it('emits critical banner below 30 integrity without importing hud', () => {
    const banners = [];
    const s = new SurvivalService({
      emitBanner: (text, icon) => banners.push({ text, icon })
    });
    s.takeDamage(75);
    assert.ok(s.circuitIntegrity < 30);
    assert.equal(banners.length, 1);
    assert.match(banners[0].text, /Critical integrity/);
  });

  it('tick drains energy then integrity', () => {
    let over = 0;
    const s = new SurvivalService({
      energyDrainRate: 10,
      integrityDrainRate: 20,
      onGameOver: () => { over += 1; }
    });
    s.tick(2);
    assert.equal(s.dataEnergy, 80);
    s.setDataEnergy(0);
    s.tick(1);
    assert.equal(s.circuitIntegrity, 80);
    s.tick(4);
    assert.equal(s.circuitIntegrity, 0);
    assert.equal(s.isGameOver, true);
    assert.equal(over, 1);
  });

  it('overclock timer ends', () => {
    const s = new SurvivalService();
    s.activateOverclock(0.5);
    assert.equal(s.isOverclockActive, true);
    assert.equal(s.tickOverclock(0.4), false);
    assert.equal(s.isOverclockActive, true);
    assert.equal(s.tickOverclock(0.2), true);
    assert.equal(s.isOverclockActive, false);
  });

  it('resetForRespawn restores stats', () => {
    const s = new SurvivalService();
    s.takeDamage(50);
    s.setDataEnergy(10);
    s.enterGameOver();
    s.resetForRespawn();
    assert.equal(s.isGameOver, false);
    assert.equal(s.dataEnergy, 100);
    assert.equal(s.circuitIntegrity, 100);
  });

  it('does not import hud showBanner', () => {
    const src = readFileSync(join(dir, 'SurvivalService.js'), 'utf8');
    assert.equal(src.includes('showBanner'), false);
    assert.equal(src.includes('ui/hud'), false);
  });
});

describe('A3 wiring', () => {
  it('main.js does not keep survival floats on Game', () => {
    const src = readFileSync(join(dir, '../main.js'), 'utf8');
    assert.equal(/this\.dataEnergy\s*=/.test(src), false);
    assert.equal(/this\.circuitIntegrity\s*=/.test(src), false);
    assert.equal(/this\.isOverclockActive\s*=/.test(src), false);
    assert.match(src, /SurvivalService/);
  });
});
