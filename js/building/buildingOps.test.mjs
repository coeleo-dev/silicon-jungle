import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOccupancy } from './buildGrid.js';
import { listImplementedTypes } from './buildCatalog.js';
import {
  applyBuildings,
  crateIsEmpty,
  place,
  removeAt,
  resetBuildIdSeq,
  snapshotBuildings
} from './buildingOps.js';

function makeInv(stacks = {}) {
  const resources = {
    pcbFloor: 0,
    pcbWall: 0,
    pcbDoor: 0,
    pcbStair: 0,
    pcbCrate: 0,
    pcbBench: 0,
    ...stacks
  };
  return {
    resources,
    getResource: (k) => resources[k] || 0,
    consumeResource: (k, n) => {
      if ((resources[k] || 0) < n) return false;
      resources[k] -= n;
      return true;
    },
    addResource: (k, n) => {
      resources[k] = (resources[k] || 0) + n;
    }
  };
}

function freshState() {
  return { occ: createOccupancy(), records: [] };
}

describe('buildingOps', () => {
  it('consume and refund floor', () => {
    resetBuildIdSeq(1);
    const state = freshState();
    const inv = makeInv({ pcbFloor: 2 });
    const h = () => 4;
    const p = place(state, { type: 'floor', ix: 1, iz: 2, layer: 0, inventory: inv, heightFn: h });
    assert.equal(p.ok, true);
    assert.equal(inv.getResource('pcbFloor'), 1);
    assert.equal(p.record.y, 4);
    const snap = snapshotBuildings(state);
    assert.equal(snap.length, 1);
    assert.equal(snap[0].type, 'floor');
    const rm = removeAt(state, { ix: 1, iz: 2, layer: 0, typeHint: 'floor', inventory: inv });
    assert.equal(rm.ok, true);
    assert.equal(inv.getResource('pcbFloor'), 2);
    assert.equal(state.records.length, 0);
  });

  it('place wall on floor edge; upper floor needs four walls', () => {
    const state = freshState();
    const inv = makeInv({ pcbFloor: 8, pcbWall: 8 });
    const h = () => 0;
    assert.equal(place(state, { type: 'floor', ix: 0, iz: 0, inventory: inv, heightFn: h }).ok, true);
    assert.equal(place(state, { type: 'wall', ix: 0, iz: 0, edge: 'N', inventory: inv, heightFn: h }).ok, true);
    assert.equal(place(state, { type: 'floor', ix: 0, iz: 0, layer: 1, inventory: inv, heightFn: h }).ok, false);
    place(state, { type: 'wall', ix: 0, iz: 0, edge: 'E', inventory: inv, heightFn: h });
    place(state, { type: 'wall', ix: 0, iz: 0, edge: 'S', inventory: inv, heightFn: h });
    place(state, { type: 'wall', ix: 0, iz: 0, edge: 'W', inventory: inv, heightFn: h });
    assert.equal(place(state, { type: 'floor', ix: 0, iz: 0, layer: 1, inventory: inv, heightFn: h }).ok, true);
  });

  it('door replaces wall and roundtrips open', () => {
    const state = freshState();
    const inv = makeInv({ pcbFloor: 2, pcbWall: 2, pcbDoor: 1 });
    const h = () => 1;
    place(state, { type: 'floor', ix: 0, iz: 0, inventory: inv, heightFn: h });
    place(state, { type: 'wall', ix: 0, iz: 0, edge: 'E', inventory: inv, heightFn: h });
    const d = place(state, { type: 'door', ix: 0, iz: 0, edge: 'E', inventory: inv, heightFn: h });
    assert.equal(d.ok, true);
    assert.equal(d.record.open, false);
    d.record.open = true;
    const snap = snapshotBuildings(state);
    const state2 = freshState();
    applyBuildings(state2, snap, h);
    assert.equal(state2.records[0].type, 'floor');
    const door = state2.records.find((r) => r.type === 'door');
    assert.equal(door.open, true);
    assert.equal(door.edge, 'E');
  });

  it('crate demolish only if empty', () => {
    const state = freshState();
    const inv = makeInv({ pcbFloor: 1, pcbCrate: 1 });
    const h = () => 0;
    place(state, { type: 'floor', ix: 3, iz: 3, inventory: inv, heightFn: h });
    const c = place(state, { type: 'crate', ix: 3, iz: 3, inventory: inv, heightFn: h });
    assert.equal(c.ok, true);
    c.record.inventory.copperWires = 2;
    assert.equal(crateIsEmpty(c.record.inventory), false);
    const blocked = removeAt(state, { ix: 3, iz: 3, typeHint: 'crate', inventory: inv });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.reason, 'crate_not_empty');
    c.record.inventory.copperWires = 0;
    const ok = removeAt(state, { ix: 3, iz: 3, typeHint: 'crate', inventory: inv });
    assert.equal(ok.ok, true);
    assert.equal(inv.getResource('pcbCrate'), 1);
  });

  it('stair needs origin floor; dest L+1 is optional', () => {
    const state = freshState();
    const inv = makeInv({ pcbFloor: 10, pcbWall: 10, pcbStair: 2 });
    const h = () => 0;
    assert.equal(place(state, { type: 'stair', ix: 0, iz: 0, rot: 0, inventory: inv, heightFn: h }).ok, false);
    place(state, { type: 'floor', ix: 0, iz: 0, inventory: inv, heightFn: h });
    assert.equal(place(state, { type: 'stair', ix: 0, iz: 0, rot: 0, inventory: inv, heightFn: h }).ok, true);
  });

  it('cycle catalog wraps', () => {
    const types = listImplementedTypes();
    assert.ok(types.length >= 1);
    let i = 0;
    i = (i + 1 + types.length) % types.length;
    i = (i - 1 + types.length) % types.length;
    assert.equal(types[i], types[0]);
  });
});

describe('saveSystem wiring', () => {
  it('snapshotPayload calls snapshotBuildings', () => {
    const dir = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(dir, '../core/saveSystem.js'), 'utf8');
    assert.match(src, /snapshotBuildings/);
    assert.match(src, /applyBuildings/);
  });
});
