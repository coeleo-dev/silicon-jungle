/**
 * saveSystem.js — Save/Load via localStorage com múltiplos mundos (Fase E / bug 14).
 * Índice MINIWORLD_SAVES + um payload por slot. Migra o blob legado v1/v2.
 */
import { inventory } from '../entities/inventory.js?v=20260912';
import { capdogInstance } from '../entities/companions/CapdogCompanion.js?v=20260912';
import { CRAFTING_RECIPES } from '../ui/crafting.js?v=20260912';
import { progression, applyCraftEffect } from './craftingDomain.js?v=20260912';
import { camera } from './scene.js?v=20260821';
import { getCollectedCount } from '../world/collectibles.js?v=20260912';
import { updateCollectedCount, updateCampaignHUD } from '../ui/hud.js?v=20260912';
import { getDifficulty, setDifficulty } from '../config/combatBalance.js?v=20260821';
import { applyCampaignState, snapshotCampaign } from './campaign.js?v=20260901';
import { snapshotWorldClock, applyWorldClock } from '../world/worldClock.js?v=20260911';
import { snapshotBuildings, applyBuildings } from '../building/BuildingService.js?v=20260914';
import { worldService } from './WorldService.js?v=20260821';
import {
  INDEX_KEY,
  LEGACY_KEY,
  SAVE_VERSION,
  slotStorageKey,
  emptyIndex,
  makeSlotId,
  buildBlankPayload,
  migrateLegacySave,
  upsertSlotMeta,
  renameSlot,
  removeSlot,
  canCreateSlot,
  summarizePayload,
  applyOpenWorldEnvelope,
  emptyOpenWorldEnvelope,
  deriveTiersFromCrafted
} from './saveSlots.js?v=20260912';

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    /* quota/privacidade */
  }
}

function parseJson(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function readIndex() {
  const data = parseJson(safeGet(INDEX_KEY));
  if (!data || !Array.isArray(data.slots)) return emptyIndex();
  return data;
}

function writeIndex(index) {
  return safeSet(INDEX_KEY, JSON.stringify(index));
}

function readSlot(id) {
  if (!id) return null;
  return parseJson(safeGet(slotStorageKey(id)));
}

function writeSlot(id, payload) {
  return safeSet(slotStorageKey(id), JSON.stringify(payload));
}

function normalizePayload(save) {
  if (!save || (save.version !== 1 && save.version !== 2 && save.version !== 3 && save.version !== 4)) return null;
  if (save.version === 1) {
    save.progression = {
      unlockedTiers: deriveTiersFromCrafted(save.craftedRecipes || []),
      unlockedBlueprints: []
    };
  }
  if (!save.difficulty) save.difficulty = 'normal';
  applyOpenWorldEnvelope(save);
  save.version = SAVE_VERSION;
  return save;
}

export function migrateLegacyIfNeeded() {
  const index = readIndex();
  if (index.slots.length > 0) return index;
  const legacy = parseJson(safeGet(LEGACY_KEY));
  if (!legacy || (legacy.version !== 1 && legacy.version !== 2)) return index;
  const now = Date.now();
  const migrated = migrateLegacySave(legacy, {
    now,
    id: makeSlotId(now),
    name: 'World 1'
  });
  if (!migrated) return index;
  const payload = normalizePayload(migrated.payload);
  if (!payload) return index;
  if (writeSlot(payload.id, payload) && writeIndex(migrated.index)) {
    safeRemove(LEGACY_KEY);
    return migrated.index;
  }
  return index;
}

function snapshotPayload({ dataEnergy, circuitIntegrity, id, name }) {
  return {
    version: SAVE_VERSION,
    id,
    name,
    timestamp: Date.now(),
    playerStats: {
      dataEnergy,
      circuitIntegrity,
      unlockedWeapons: inventory.unlockedWeapons.slice(),
      equippedWeaponSlot: inventory.currentSlot
    },
    inventory: inventory.getAllResources(),
    capdog: capdogInstance
      ? {
          isTamed: capdogInstance.isTamed,
          level: capdogInstance.level,
          hp: capdogInstance.hp,
          maxHp: capdogInstance.maxHp
        }
      : null,
    craftedRecipes: CRAFTING_RECIPES.filter((r) => r.crafted).map((r) => r.id),
    progression: {
      unlockedTiers: progression.unlockedTiers.slice(),
      unlockedBlueprints: progression.unlockedBlueprints.slice()
    },
    playerPosition: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
    collectedCoresCount: getCollectedCount(),
    difficulty: getDifficulty(),
    ...emptyOpenWorldEnvelope(),
    campaign: snapshotCampaign(),
    worldClock: snapshotWorldClock(),
    buildings: snapshotBuildings()
  };
}

function persistPayload(index, payload) {
  const summary = summarizePayload(payload);
  const next = upsertSlotMeta(index, {
    id: payload.id,
    name: payload.name,
    updatedAt: payload.timestamp,
    difficulty: payload.difficulty,
    summary
  });
  next.activeId = payload.id;
  writeSlot(payload.id, payload);
  writeIndex(next);
  return next;
}

export function saveGame({ dataEnergy, circuitIntegrity }) {
  let index = migrateLegacyIfNeeded();
  if (!index.activeId || !index.slots.some((s) => s.id === index.activeId)) {
    if (!canCreateSlot(index)) return;
    const now = Date.now();
    const id = makeSlotId(now);
    const name = 'World 1';
    const payload = snapshotPayload({ dataEnergy, circuitIntegrity, id, name });
    persistPayload(index, payload);
    return;
  }
  const meta = index.slots.find((s) => s.id === index.activeId);
  const payload = snapshotPayload({
    dataEnergy,
    circuitIntegrity,
    id: index.activeId,
    name: meta?.name || 'World 1'
  });
  persistPayload(index, payload);
}

export function loadGame() {
  try {
    const index = migrateLegacyIfNeeded();
    if (!index.activeId) return null;
    return normalizePayload(readSlot(index.activeId));
  } catch (e) {
    return null;
  }
}

export function listWorlds() {
  return migrateLegacyIfNeeded();
}

export function getActiveSlotId() {
  return migrateLegacyIfNeeded().activeId;
}

export function canCreateWorld() {
  return canCreateSlot(migrateLegacyIfNeeded());
}

export function createWorld({ name, difficulty, playerPosition } = {}) {
  const index = migrateLegacyIfNeeded();
  if (!canCreateSlot(index)) return null;
  const now = Date.now();
  const id = makeSlotId(now);
  const trimmed = String(name || '').trim() || `World ${index.slots.length + 1}`;
  const payload = buildBlankPayload({
    id,
    name: trimmed,
    difficulty: difficulty || getDifficulty() || 'normal',
    timestamp: now,
    playerPosition: playerPosition || { x: 0, y: 1.8, z: 30 }
  });
  persistPayload(index, payload);
  return { id, payload };
}

export function renameWorld(id, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) return false;
  const index = migrateLegacyIfNeeded();
  if (!index.slots.some((s) => s.id === id)) return false;
  const next = renameSlot(index, id, trimmed);
  const ok = writeIndex(next);
  const payload = readSlot(id);
  if (ok && payload) {
    payload.name = trimmed;
    writeSlot(id, payload);
  }
  return ok;
}

export function deleteWorld(id) {
  const index = migrateLegacyIfNeeded();
  const wasActive = index.activeId === id;
  const next = removeSlot(index, id);
  safeRemove(slotStorageKey(id));
  writeIndex(next);
  return { nextActiveId: next.activeId, removedActive: wasActive };
}

export function setActiveWorld(id) {
  const index = migrateLegacyIfNeeded();
  if (!index.slots.some((s) => s.id === id)) return false;
  return writeIndex({ ...index, activeId: id });
}

export function requestWorldReload() {
  try {
    location.reload();
  } catch (e) {
    /* ambiente sem window */
  }
}

export function restoreFromSave(save) {
  if (save.inventory) inventory.resources = { ...inventory.resources, ...save.inventory };

  if (Array.isArray(save.playerStats?.unlockedWeapons)) {
    inventory.unlockedWeapons = save.playerStats.unlockedWeapons.slice();
  }

  for (const id of save.craftedRecipes || []) {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === id);
    if (recipe) {
      recipe.crafted = true;
      try {
        applyCraftEffect(recipe.id, null);
      } catch (e) {
        /* efeito não aplicável */
      }
    }
  }

  const slot = save.playerStats?.equippedWeaponSlot || 3;
  try {
    inventory.equipSlot(slot, false);
  } catch (e) {
    /* slot inválido */
  }

  if (capdogInstance && save.capdog) {
    capdogInstance.level = save.capdog.level ?? capdogInstance.level;
    capdogInstance.maxHp = save.capdog.maxHp ?? capdogInstance.maxHp;
    capdogInstance.hp = save.capdog.hp ?? capdogInstance.hp;
    capdogInstance.isTamed = save.capdog.isTamed ?? true;
  }

  if (save.playerPosition) {
    camera.position.set(save.playerPosition.x, save.playerPosition.y, save.playerPosition.z);
  }

  if (save.collectedCoresCount !== undefined) updateCollectedCount(save.collectedCoresCount);

  if (save.progression) {
    progression.unlockedTiers = (save.progression.unlockedTiers || []).slice();
    progression.unlockedBlueprints = (save.progression.unlockedBlueprints || []).slice();
  } else {
    progression.unlockedTiers = deriveTiersFromCrafted(save.craftedRecipes || []);
    progression.unlockedBlueprints = [];
  }
  if (!progression.unlockedTiers.includes(1)) progression.unlockedTiers.unshift(1);

  if (save.difficulty) setDifficulty(save.difficulty);

  applyCampaignState(save.campaign);
  applyWorldClock(save.worldClock);
  applyBuildings(save.buildings, (x, z) => worldService.getHeight(x, z));
  updateCampaignHUD();

  return {
    dataEnergy: save.playerStats?.dataEnergy ?? 100,
    circuitIntegrity: save.playerStats?.circuitIntegrity ?? 100
  };
}
