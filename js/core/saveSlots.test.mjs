import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeSlotId,
  buildBlankPayload,
  migrateLegacySave,
  applyOpenWorldEnvelope,
  upsertSlotMeta,
  renameSlot,
  removeSlot,
  canCreateSlot,
  summarizePayload,
  emptyIndex,
  MAX_SLOTS,
  SAVE_VERSION
} from './saveSlots.js';

describe('makeSlotId', () => {
  it('prefixes w_ and uses base36', () => {
    const id = makeSlotId(36, () => 0);
    assert.match(id, /^w_/);
    assert.equal(id.startsWith('w_10'), true);
  });
});

describe('buildBlankPayload', () => {
  it('has version 4, no crafts, and an empty open-world envelope', () => {
    const p = buildBlankPayload({
      id: 'w_a',
      name: 'Mundo 1',
      difficulty: 'easy',
      timestamp: 1000,
      playerPosition: { x: 0, y: 1.8, z: 30 }
    });
    assert.equal(p.version, SAVE_VERSION);
    assert.equal(p.version, 4);
    assert.deepEqual(p.craftedRecipes, []);
    assert.equal(p.playerStats.dataEnergy, 100);
    assert.equal(p.collectedCoresCount, 0);
    assert.equal(p.capdog.isTamed, false);
    assert.equal(p.capdog.level, 1);
    assert.equal(p.inventory.energyCells, 1);
    assert.equal(p.inventory.pureSilicon, 0);
    assert.equal(p.inventory.silverCompound, 0);
    assert.equal(p.inventory.lithiumCells, 0);
    assert.equal(p.inventory.electrolyte, 0);
    assert.equal(p.inventory.tiCuAlloy, 0);
    assert.deepEqual(p.progression.unlockedTiers, [1]);
    assert.equal(p.difficulty, 'easy');
    assert.deepEqual(p.campaign, {
      buses: { atx: false, dimm: false, io: false, heatsink: false },
      phenomDefeated: false
    });
    assert.deepEqual(p.buildings, []);
    assert.deepEqual(p.powerGraph, { nodes: [], edges: [] });
    assert.deepEqual(p.worldClock, { timeOfDay: 0, storm: false });
  });
});

describe('migrateLegacySave', () => {
  it('turns a v2 save into one slot pointed by activeId', () => {
    const legacy = {
      version: 2,
      timestamp: 50,
      playerStats: { dataEnergy: 40, circuitIntegrity: 80, unlockedWeapons: ['knife'], equippedWeaponSlot: 3 },
      inventory: { energyCells: 2 },
      craftedRecipes: ['arc_shotgun'],
      progression: { unlockedTiers: [1, 2], unlockedBlueprints: [] },
      collectedCoresCount: 7
    };
    const { index, payload } = migrateLegacySave(legacy, { now: 99, id: 'w_legacy', name: 'Mundo 1' });
    assert.equal(index.activeId, 'w_legacy');
    assert.equal(index.slots.length, 1);
    assert.equal(index.slots[0].id, 'w_legacy');
    assert.equal(payload.version, 4);
    assert.equal(payload.id, 'w_legacy');
    assert.equal(payload.difficulty, 'normal');
    assert.equal(payload.playerStats.dataEnergy, 40);
    assert.equal(index.slots[0].summary.cores, 7);
    assert.equal(index.slots[0].summary.dataEnergy, 40);
  });

  it('migrates a v3 payload to v4 without dropping inventory', () => {
    const v3 = {
      version: 3,
      id: 'w_old',
      name: 'Mundo 1',
      playerStats: { dataEnergy: 77 },
      inventory: { energyCells: 2, copperWires: 4 },
      craftedRecipes: [],
      collectedCoresCount: 1
    };
    const payload = applyOpenWorldEnvelope({ ...v3 });
    assert.equal(payload.version, 4);
    assert.equal(payload.inventory.energyCells, 2);
    assert.equal(payload.inventory.copperWires, 4);
    assert.equal(payload.inventory.pureSilicon, 0);
    assert.equal(payload.inventory.silverCompound, 0);
    assert.equal(payload.inventory.lithiumCells, 0);
    assert.equal(payload.inventory.electrolyte, 0);
    assert.equal(payload.inventory.tiCuAlloy, 0);
    assert.equal(payload.inventory.pcbFloor, 0);
    assert.equal(payload.campaign.buses.atx, false);
    assert.equal(payload.campaign.phenomDefeated, false);
    assert.deepEqual(payload.buildings, []);
    assert.deepEqual(payload.powerGraph, { nodes: [], edges: [] });
    assert.equal(payload.worldClock.timeOfDay, 0);
    assert.equal(payload.worldClock.storm, false);
  });

  it('defaults difficulty to normal and derives v1 tiers', () => {
    const legacy = {
      version: 1,
      playerStats: { dataEnergy: 100 },
      craftedRecipes: ['arc_shotgun']
    };
    const { payload } = migrateLegacySave(legacy, { now: 1, id: 'w_1', name: 'A' });
    assert.equal(payload.difficulty, 'normal');
    assert.ok(payload.progression.unlockedTiers.includes(1));
    assert.ok(payload.progression.unlockedTiers.includes(2));
  });
});

describe('summarizePayload', () => {
  it('reads cores and dataEnergy', () => {
    const s = summarizePayload({
      collectedCoresCount: 3,
      playerStats: { dataEnergy: 55 }
    });
    assert.deepEqual(s, { cores: 3, dataEnergy: 55 });
  });
});

describe('renameSlot', () => {
  it('trims the name and ignores empty', () => {
    const idx = {
      version: 3,
      activeId: 'a',
      slots: [{ id: 'a', name: 'Old', updatedAt: 1, difficulty: 'normal', summary: { cores: 0, dataEnergy: 100 } }]
    };
    const renamed = renameSlot(idx, 'a', '  Selva  ');
    assert.equal(renamed.slots[0].name, 'Selva');
    const empty = renameSlot(idx, 'a', '   ');
    assert.equal(empty.slots[0].name, 'Old');
  });
});

describe('removeSlot', () => {
  it('when deleting the active slot, picks the most recently updated remaining', () => {
    const idx = {
      version: 3,
      activeId: 'a',
      slots: [
        { id: 'a', name: 'A', updatedAt: 30, difficulty: 'normal', summary: { cores: 0, dataEnergy: 100 } },
        { id: 'b', name: 'B', updatedAt: 10, difficulty: 'easy', summary: { cores: 0, dataEnergy: 100 } },
        { id: 'c', name: 'C', updatedAt: 20, difficulty: 'hard', summary: { cores: 0, dataEnergy: 100 } }
      ]
    };
    const next = removeSlot(idx, 'a');
    assert.equal(next.activeId, 'c');
    assert.equal(next.slots.length, 2);
    assert.equal(next.slots.find(s => s.id === 'a'), undefined);
  });

  it('sets activeId to null when the last slot is removed', () => {
    const idx = {
      version: 3,
      activeId: 'a',
      slots: [{ id: 'a', name: 'A', updatedAt: 1, difficulty: 'normal', summary: { cores: 0, dataEnergy: 100 } }]
    };
    const next = removeSlot(idx, 'a');
    assert.equal(next.activeId, null);
    assert.deepEqual(next.slots, []);
  });
});

describe('canCreateSlot', () => {
  it('is false at the 8-slot cap', () => {
    const slots = [];
    for (let i = 0; i < MAX_SLOTS; i++) {
      slots.push({ id: `w_${i}`, name: `M${i}`, updatedAt: i, difficulty: 'normal', summary: { cores: 0, dataEnergy: 100 } });
    }
    assert.equal(canCreateSlot({ slots }), false);
    assert.equal(canCreateSlot(emptyIndex()), true);
    assert.equal(canCreateSlot({ slots: slots.slice(0, 7) }), true);
  });
});

describe('upsertSlotMeta', () => {
  it('inserts or replaces by id', () => {
    let idx = emptyIndex();
    idx = upsertSlotMeta(idx, { id: 'a', name: 'A', updatedAt: 1, difficulty: 'normal', summary: { cores: 0, dataEnergy: 100 } });
    idx = upsertSlotMeta(idx, { id: 'a', name: 'A2', updatedAt: 2, difficulty: 'hard', summary: { cores: 1, dataEnergy: 90 } });
    assert.equal(idx.slots.length, 1);
    assert.equal(idx.slots[0].name, 'A2');
    assert.equal(idx.slots[0].difficulty, 'hard');
  });
});
