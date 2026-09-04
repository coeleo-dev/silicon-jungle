/**
 * getNearbyEnemies filtra por tag hostile, não por type hardcoded.
 * Rode: node --test js/core/EntityRegistry.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EntityRegistry } from './EntityRegistry.js';

function fake({ id, type, x = 0, z = 0, isDead = false, tags = new Set() }) {
  return { id, type, isDead, tags, group: { position: { x, y: 0, z } } };
}

describe('getNearbyEnemies', () => {
  it('devolve hostis no raio independentemente do type', () => {
    const r = new EntityRegistry();
    r.register(fake({ id: 'd', type: 'heat_drone', x: 3, z: 0, tags: new Set(['hostile']) }));
    r.register(fake({ id: 'c', type: 'capdog', x: 2, z: 0, tags: new Set() }));
    const found = r.getNearbyEnemies({ x: 0, z: 0 }, 10);
    assert.equal(found.length, 1);
    assert.equal(found[0].id, 'd');
  });

  it('inclui spider_bot e sentinel com tag hostile', () => {
    const r = new EntityRegistry();
    r.register(fake({ id: 's', type: 'spider_bot', x: 1, z: 0, tags: new Set(['hostile']) }));
    r.register(fake({ id: 't', type: 'sentinel', x: 2, z: 0, tags: new Set(['hostile']) }));
    assert.equal(r.getNearbyEnemies({ x: 0, z: 0 }, 10).length, 2);
  });

  it('ignora mortos e fora do raio', () => {
    const r = new EntityRegistry();
    r.register(fake({ id: 'dead', type: 'spider_bot', x: 1, z: 0, isDead: true, tags: new Set(['hostile']) }));
    r.register(fake({ id: 'far', type: 'spider_bot', x: 100, z: 0, tags: new Set(['hostile']) }));
    assert.equal(r.getNearbyEnemies({ x: 0, z: 0 }, 10).length, 0);
  });
});
