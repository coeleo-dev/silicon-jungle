/**
 * craftingDomain.js — Domínio de Crafting (Tech Tiers) — Fase 4 / Onda A
 * Centraliza o estado de progressão (tiers/blueprints) e os efeitos reais de
 * cada receita. NÃO importa crafting.js (evita ciclo de import).
 *
 * Fluxo de dependência (sem ciclos):
 *   craftingDomain.js  ←  crafting.js  ←  saveSystem.js
 *   craftingDomain.js  ←  saveSystem.js
 */
import { CONFIG } from '../config/constants.js?v=20260821';
import { inventory } from '../entities/inventory.js?v=20260912';
import { capdogInstance } from '../entities/companions/CapdogCompanion.js?v=20260912';
import { audioService } from './AudioService.js?v=20260821';
import { eventBus } from './EventBus.js?v=20260821';
import { EVENTS } from './events.js?v=20260912';

/**
 * Estado global de progressão (persistido no save v2).
 */
export const progression = {
  unlockedTiers: [1],       // number[]
  unlockedBlueprints: []    // string[] (recipe ids; usado pelo comércio na próxima lane)
};

export function isTierUnlocked(t) {
  return progression.unlockedTiers.includes(t);
}

export function unlockTier(t) {
  if (!progression.unlockedTiers.includes(t)) {
    progression.unlockedTiers.push(t);
  }
}

export function isBlueprintUnlocked(id) {
  return progression.unlockedBlueprints.includes(id);
}

export function unlockBlueprint(id) {
  if (!progression.unlockedBlueprints.includes(id)) {
    progression.unlockedBlueprints.push(id);
  }
}

/**
 * Efeitos reais de cada receita (corpo movido verbatim dos closures de craft()).
 * `gameContext` pode ser null; usa optional chaining onde necessário.
 * Chamadas a equipSlot usam playSound=false (não toca som de troca no restore).
 * Banners via EventBus (A2) — o domínio não importa o HUD.
 */
export const CRAFT_EFFECTS = {
  'plasma_extended_mag': () => {
    CONFIG.WEAPONS.PLASMA_PISTOL.DAMAGE = 30;
    eventBus.emit(EVENTS.UI_BANNER, { text: '🔫 Extended mag forged! Pistol damage increased to 30!', icon: '⚡' });
  },
  'arc_shotgun': () => {
    inventory.unlockWeapon(CONFIG.WEAPONS.ARC_SHOTGUN.ID);
    inventory.equipSlot(4, false);
    eventBus.emit(EVENTS.UI_BANNER, { text: '💥 Arc Shotgun unlocked in slot 4!', icon: '🏆' });
  },
  'bus_rifle': () => {
    inventory.unlockWeapon(CONFIG.WEAPONS.BUS_RIFLE.ID);
    inventory.equipSlot(5, false);
    eventBus.emit(EVENTS.UI_BANNER, { text: `🎯 Bus Rifle unlocked in slot 5 (${CONFIG.WEAPONS.BUS_RIFLE.DAMAGE} damage)!`, icon: '🏆' });
  },
  'capdog_armor': () => {
    if (capdogInstance) {
      capdogInstance.level = 2;
      capdogInstance.maxHp = 160;
      capdogInstance.hp = 160;
    }
    eventBus.emit(EVENTS.UI_BANNER, { text: '🐕 Capdog upgraded to level 2! (+160 HP and armor)', icon: '🛡️' });
  },
  'capdog_shock_coil': () => {
    if (capdogInstance) {
      capdogInstance.level = 3;
      capdogInstance.maxHp = 200;
      capdogInstance.hp = 200;
      capdogInstance.damage = 40;
    }
    eventBus.emit(EVENTS.UI_BANNER, { text: '⚡ Capdog level 3 unlocked! Area shock and 40 damage!', icon: '🐕' });
  },
  'thermal_injector': (ctx) => {
    ctx?.restoreIntegrity?.(50);
    audioService.play('playHealThermalPaste');
    eventBus.emit(EVENTS.UI_BANNER, { text: '💚 Integrity repaired +50% at the bench!', icon: '🧪' });
  },
  'pcb_floor': () => {
    inventory.addResource('pcbFloor', 1);
    eventBus.emit(EVENTS.UI_BANNER, { text: 'PCB floor forged. Press [B] to build.', icon: '⬛' });
  },
  'pcb_wall': () => {
    inventory.addResource('pcbWall', 1);
    eventBus.emit(EVENTS.UI_BANNER, { text: 'PCB wall forged.', icon: '🧱' });
  },
  'pcb_door': () => {
    inventory.addResource('pcbDoor', 1);
    eventBus.emit(EVENTS.UI_BANNER, { text: 'PCB door forged.', icon: '🚪' });
  },
  'pcb_stair': () => {
    inventory.addResource('pcbStair', 1);
    eventBus.emit(EVENTS.UI_BANNER, { text: 'PCB stair forged.', icon: '🪜' });
  },
  'pcb_crate': () => {
    inventory.addResource('pcbCrate', 1);
    eventBus.emit(EVENTS.UI_BANNER, { text: 'PCB crate forged.', icon: '📦' });
  },
  'pcb_bench': () => {
    inventory.addResource('pcbBench', 1);
    eventBus.emit(EVENTS.UI_BANNER, { text: 'PCB bench forged.', icon: '🛠️' });
  }
};

/**
 * Executa o efeito de uma receita, se existir.
 */
export function applyCraftEffect(recipeId, gameContext = null) {
  const effect = CRAFT_EFFECTS[recipeId];
  if (effect) effect(gameContext);
}
