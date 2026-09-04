import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_SIZE,
  STOREY_HEIGHT,
  snapCell,
  floorY,
  rotateYaw90,
  yawToDir,
  neighborCell,
  canonicalWall,
  wallKey,
  floorKey,
  createOccupancy,
  hasFourWalls,
  canPlaceFloor,
  storeyLayerFromAim
} from './buildGrid.js';

describe('buildGrid', () => {
  it('CELL_SIZE 1 and STOREY_HEIGHT 2.2', () => {
    assert.equal(CELL_SIZE, 1);
    assert.equal(STOREY_HEIGHT, 2.2);
  });

  it('snapCell uses Math.round', () => {
    assert.deepEqual(snapCell(0.4, 0.6), { ix: 0, iz: 1 });
    assert.deepEqual(snapCell(-0.6, -1.4), { ix: -1, iz: -1 });
  });

  it('canonical E equals neighbor W', () => {
    const a = canonicalWall(0, 0, 0, 'E');
    const b = canonicalWall(1, 0, 0, 'W');
    assert.deepEqual(a, { ix: 0, iz: 0, layer: 0, edge: 'E' });
    assert.deepEqual(b, a);
    assert.equal(wallKey(0, 0, 0, 'E'), wallKey(1, 0, 0, 'W'));
  });

  it('canonical N equals neighbor S', () => {
    assert.equal(wallKey(0, 0, 0, 'N'), wallKey(0, 1, 0, 'S'));
  });

  it('floorY adds storey height', () => {
    const y = floorY(2, 3, 2, (ix, iz) => ix + iz);
    assert.equal(y, 2 + 3 + 4.4);
  });

  it('occupancy rejects duplicate add', () => {
    const occ = createOccupancy();
    const k = floorKey(1, 2, 0);
    assert.equal(occ.add(k), true);
    assert.equal(occ.add(k), false);
    assert.equal(occ.has(k), true);
    occ.remove(k);
    assert.equal(occ.has(k), false);
  });

  it('hasFourWalls needs N E S W', () => {
    const occ = createOccupancy();
    assert.equal(hasFourWalls(occ, 0, 0, 0), false);
    occ.add(wallKey(0, 0, 0, 'N'));
    occ.add(wallKey(0, 0, 0, 'E'));
    occ.add(wallKey(0, 0, 0, 'S'));
    occ.add(wallKey(0, 0, 0, 'W'));
    assert.equal(hasFourWalls(occ, 0, 0, 0), true);
  });

  it('storeyLayerFromAim keeps eye-height on layer 0', () => {
    assert.equal(storeyLayerFromAim(1.6, 0), 0);
    assert.equal(storeyLayerFromAim(2.19, 0), 0);
    assert.equal(storeyLayerFromAim(2.2, 0), 1);
    assert.equal(storeyLayerFromAim(-1, 0), 0);
  });

  it('canPlaceFloor layer 0 free; layer 1 needs four walls', () => {
    const occ = createOccupancy();
    assert.equal(canPlaceFloor(occ, 0, 0, 0), true);
    occ.add(floorKey(0, 0, 0));
    assert.equal(canPlaceFloor(occ, 0, 0, 0), false);
    assert.equal(canPlaceFloor(occ, 0, 0, 1), false);
    occ.add(wallKey(0, 0, 0, 'N'));
    occ.add(wallKey(0, 0, 0, 'E'));
    occ.add(wallKey(0, 0, 0, 'S'));
    occ.add(wallKey(0, 0, 0, 'W'));
    assert.equal(canPlaceFloor(occ, 0, 0, 1), true);
  });

  it('yaw 0 is +Z; +90 is +X', () => {
    assert.deepEqual(yawToDir(0), { dx: 0, dz: 1 });
    assert.deepEqual(yawToDir(Math.PI / 2), { dx: 1, dz: 0 });
    assert.deepEqual(neighborCell(0, 0, 0), { ix: 0, iz: 1 });
    assert.equal(rotateYaw90(0), Math.PI / 2);
  });
});
