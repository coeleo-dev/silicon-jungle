import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BUILD_CATALOG, getCatalogEntry, listImplementedTypes } from './buildCatalog.js';

describe('buildCatalog', () => {
  it('maps types to english inventory keys', () => {
    assert.equal(getCatalogEntry('floor').inventoryKey, 'pcbFloor');
    assert.equal(getCatalogEntry('wall').recipeId, 'pcb_wall');
    assert.equal(BUILD_CATALOG.door.inventoryKey, 'pcbDoor');
    assert.deepEqual(listImplementedTypes(), ['floor', 'wall', 'door', 'stair', 'crate', 'bench']);
  });
});
