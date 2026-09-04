/**
 * saveSlots.js — Lógica pura de slots de mundo (Fase E / bug 14).
 * Sem localStorage, DOM ou Three. Testável com node:test.
 */

export const INDEX_KEY = 'MINIWORLD_SAVES';
export const SLOT_PREFIX = 'MINIWORLD_SAVE_';
export const LEGACY_KEY = 'MINIWORLD_SAVE_DATA';
export const SAVE_VERSION = 4;
export const MAX_SLOTS = 8;

/** id de receita → tier (espelha CRAFTING_RECIPES, sem importar o módulo de UI). */
export const RECIPE_TIERS = {
  plasma_extended_mag: 1,
  thermal_injector: 1,
  arc_shotgun: 2,
  capdog_armor: 2,
  bus_rifle: 3,
  capdog_shock_coil: 3,
  emp_grenade: 3,
  heatpipe_armor: 4,
  pcie_fusion_cannon: 4
};

const STARTER_WEAPONS = ['knife', 'flashlight', 'plasma_pistol'];
const STARTER_INVENTORY = {
  energyCells: 1,
  copperWires: 0,
  thermalPastes: 0,
  clockCrystals: 0,
  pureSilicon: 0,
  silverCompound: 0,
  lithiumCells: 0,
  electrolyte: 0,
  tiCuAlloy: 0,
  pcbFloor: 0,
  pcbWall: 0,
  pcbDoor: 0,
  pcbStair: 0,
  pcbCrate: 0,
  pcbBench: 0
};

export function emptyCampaign() {
  return {
    buses: { atx: false, dimm: false, io: false, heatsink: false },
    phenomDefeated: false
  };
}

export function emptyOpenWorldEnvelope() {
  return {
    campaign: emptyCampaign(),
    buildings: [],
    powerGraph: { nodes: [], edges: [] },
    worldClock: { timeOfDay: 0, storm: false }
  };
}

export function applyOpenWorldEnvelope(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const defaults = emptyOpenWorldEnvelope();
  if (!payload.campaign || typeof payload.campaign !== 'object') {
    payload.campaign = defaults.campaign;
  } else {
    payload.campaign.buses = {
      ...defaults.campaign.buses,
      ...(payload.campaign.buses || {})
    };
    if (typeof payload.campaign.phenomDefeated !== 'boolean') {
      payload.campaign.phenomDefeated = false;
    }
  }
  if (!Array.isArray(payload.buildings)) payload.buildings = [];
  if (!payload.powerGraph || typeof payload.powerGraph !== 'object') {
    payload.powerGraph = defaults.powerGraph;
  } else {
    if (!Array.isArray(payload.powerGraph.nodes)) payload.powerGraph.nodes = [];
    if (!Array.isArray(payload.powerGraph.edges)) payload.powerGraph.edges = [];
  }
  if (!payload.worldClock || typeof payload.worldClock !== 'object') {
    payload.worldClock = defaults.worldClock;
  } else {
    if (typeof payload.worldClock.timeOfDay !== 'number') payload.worldClock.timeOfDay = 0;
    if (typeof payload.worldClock.storm !== 'boolean') payload.worldClock.storm = false;
  }
  payload.inventory = { ...STARTER_INVENTORY, ...(payload.inventory || {}) };
  payload.version = SAVE_VERSION;
  return payload;
}

export function slotStorageKey(id) {
  return `${SLOT_PREFIX}${id}`;
}

export function emptyIndex() {
  return { version: SAVE_VERSION, activeId: null, slots: [] };
}

export function makeSlotId(now, rng = Math.random) {
  const rand = Math.floor((typeof rng === 'function' ? rng() : 0) * 36 ** 4)
    .toString(36)
    .padStart(4, '0');
  return `w_${Number(now).toString(36)}${rand}`;
}

export function deriveTiersFromCrafted(craftedRecipes, recipeTiers = RECIPE_TIERS) {
  const tiers = [1];
  for (const id of craftedRecipes || []) {
    const t = recipeTiers[id];
    if (t != null && !tiers.includes(t)) tiers.push(t);
  }
  return tiers;
}

export function summarizePayload(payload) {
  return {
    cores: payload?.collectedCoresCount ?? 0,
    dataEnergy: payload?.playerStats?.dataEnergy ?? 100
  };
}

export function buildBlankPayload({
  id,
  name,
  difficulty = 'normal',
  timestamp = Date.now(),
  playerPosition = { x: 0, y: 1.8, z: 30 }
} = {}) {
  return applyOpenWorldEnvelope({
    version: SAVE_VERSION,
    id,
    name,
    timestamp,
    playerStats: {
      dataEnergy: 100,
      circuitIntegrity: 100,
      unlockedWeapons: STARTER_WEAPONS.slice(),
      equippedWeaponSlot: 3
    },
    inventory: { ...STARTER_INVENTORY },
    capdog: { isTamed: false, level: 1, hp: 100, maxHp: 100 },
    craftedRecipes: [],
    progression: { unlockedTiers: [1], unlockedBlueprints: [] },
    playerPosition: { ...playerPosition },
    collectedCoresCount: 0,
    difficulty
  });
}

export function migrateLegacySave(legacy, { now = Date.now(), id, name } = {}) {
  if (!legacy || (legacy.version !== 1 && legacy.version !== 2)) return null;
  const difficulty = legacy.difficulty || 'normal';
  const timestamp = now;
  const payload = applyOpenWorldEnvelope({
    ...legacy,
    version: SAVE_VERSION,
    id,
    name,
    difficulty,
    timestamp
  });
  if (legacy.version === 1 || !payload.progression) {
    payload.progression = {
      unlockedTiers: deriveTiersFromCrafted(legacy.craftedRecipes || []),
      unlockedBlueprints: []
    };
  }
  const summary = summarizePayload(payload);
  const index = {
    version: SAVE_VERSION,
    activeId: id,
    slots: [{ id, name, updatedAt: timestamp, difficulty, summary }]
  };
  return { index, payload };
}

export function upsertSlotMeta(index, meta) {
  const src = index && Array.isArray(index.slots) ? index : emptyIndex();
  const slots = src.slots.slice();
  const i = slots.findIndex((s) => s.id === meta.id);
  if (i >= 0) slots[i] = { ...slots[i], ...meta };
  else slots.push({ ...meta });
  return { ...src, version: src.version ?? SAVE_VERSION, slots };
}

export function renameSlot(index, id, name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return index;
  return {
    ...index,
    slots: (index.slots || []).map((s) => (s.id === id ? { ...s, name: trimmed } : s))
  };
}

export function removeSlot(index, id) {
  const slots = (index.slots || []).filter((s) => s.id !== id);
  let activeId = index.activeId;
  if (activeId === id) {
    const latest = slots.slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
    activeId = latest ? latest.id : null;
  }
  return { ...index, slots, activeId };
}

export function canCreateSlot(index) {
  return (index?.slots?.length ?? 0) < MAX_SLOTS;
}
