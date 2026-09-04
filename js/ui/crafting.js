import { inventory } from '../entities/inventory.js?v=20260912';
import { audioService } from '../core/AudioService.js?v=20260821';
import { showBanner } from './hud.js?v=20260912';
import { applyCraftEffect, isTierUnlocked, isBlueprintUnlocked, unlockTier, progression } from '../core/craftingDomain.js?v=20260912';

let craftingOverlayEl = null;
let craftingListEl = null;
let btnCloseEl = null;
let isCraftingOpen = false;
let openedTimestamp = 0;
let playerControllerRef = null;

export const CRAFTING_RECIPES = [
  {
    id: 'plasma_extended_mag',
    title: '⚡ Extended Plasma Mag',
    desc: 'Tunes the pistol capacitors: plasma damage rises to 30!',
    icon: '🔫',
    cost: { copperWires: 4, clockCrystals: 1 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: false,
    crafted: false
  },
  {
    id: 'arc_shotgun',
    title: '💥 Arc Shotgun',
    desc: 'Heavy spread weapon: fires 5 high-voltage electric arcs at once.',
    icon: '⚡',
    cost: { copperWires: 6, clockCrystals: 2 },
    tier: 2,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: false,
    crafted: false
  },
  {
    id: 'bus_rifle',
    title: '🎯 Bus Rifle',
    desc: 'High-precision laser rifle that punches ceramic armor at long range.',
    icon: '🔴',
    cost: { copperWires: 8, clockCrystals: 3 },
    tier: 3,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: false,
    crafted: false
  },
  {
    id: 'capdog_armor',
    title: '🛡️ Capdog Ceramic Armor',
    desc: 'Reinforces Capdog chassis to 160 HP and grants laser-web immunity.',
    icon: '🐕',
    cost: { copperWires: 5, energyCells: 2 },
    tier: 2,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: false,
    crafted: false
  },
  {
    id: 'capdog_shock_coil',
    title: '⚡ Capdog Dual Shock Coil',
    desc: 'Raises bite damage to 40 and dumps area electric discharges nearby.',
    icon: '💥',
    cost: { copperWires: 8, clockCrystals: 3, energyCells: 2 },
    tier: 3,
    requires: ['capdog_armor'],
    blueprintGated: false,
    comingSoon: false,
    repeatable: false,
    crafted: false
  },
  {
    id: 'thermal_injector',
    title: '🧪 Thermal Paste Injector (Full Repair)',
    desc: 'Concentrated mix that instantly repairs +50% circuit integrity.',
    icon: '🧪',
    cost: { thermalPastes: 2, copperWires: 1 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true, // Repetível
    crafted: false
  },
  {
    id: 'pcb_floor',
    title: '⬛ PCB Floor',
    desc: '1×1 circuit slab. Craft it, then place it in the world with [B].',
    icon: '⬛',
    cost: { copperWires: 2 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true,
    crafted: false
  },
  {
    id: 'pcb_wall',
    title: '🧱 PCB Wall',
    desc: '2.2 m wall on a cell edge.',
    icon: '🧱',
    cost: { copperWires: 2 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true,
    crafted: false
  },
  {
    id: 'pcb_door',
    title: '🚪 PCB Door',
    desc: 'Replaces a wall. [E] opens and closes it.',
    icon: '🚪',
    cost: { copperWires: 2, clockCrystals: 1 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true,
    crafted: false
  },
  {
    id: 'pcb_stair',
    title: '🪜 PCB Stair',
    desc: 'Climbs one storey (L → L+1). Needs a floor at the origin.',
    icon: '🪜',
    cost: { copperWires: 3 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true,
    crafted: false
  },
  {
    id: 'pcb_crate',
    title: '📦 PCB Crate',
    desc: 'Two-panel storage. Demolish only when empty.',
    icon: '📦',
    cost: { copperWires: 4 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true,
    crafted: false
  },
  {
    id: 'pcb_bench',
    title: '🛠️ PCB Bench',
    desc: 'Placeable bench. [E] opens crafting. No power required.',
    icon: '🛠️',
    cost: { copperWires: 6, clockCrystals: 1 },
    tier: 1,
    requires: [],
    blueprintGated: false,
    comingSoon: false,
    repeatable: true,
    crafted: false
  },
  { id: 'emp_grenade', title: '💣 EMP Grenade', desc: 'Coming soon.', icon: '📜', tier: 3, requires: [], blueprintGated: true, comingSoon: true, repeatable: false, crafted: false },
  { id: 'heatpipe_armor', title: '🛡️ Heatpipe Armor', desc: 'Coming soon.', icon: '🛡️', tier: 4, requires: [], blueprintGated: false, comingSoon: true, crafted: false },
  { id: 'pcie_fusion_cannon', title: '☄️ PCIe Fusion Cannon', desc: 'Coming soon.', icon: '☄️', tier: 4, requires: ['bus_rifle'], blueprintGated: false, comingSoon: true, crafted: false }
];

export const CRAFTING_TIERS = [
  { tier: 1, name: 'Scrap & Analog',              icon: '🔩', unlockCost: 0  },
  { tier: 2, name: 'Transistor Logic (TTL)',        icon: '🔌', unlockCost: 3  },
  { tier: 3, name: 'Integrated Circuits (SMD)',     icon: '🧠', unlockCost: 6  },
  { tier: 4, name: 'Overclock & Quantum Core',      icon: '⚛️', unlockCost: 12 }
];

export function initCraftingUI(playerController) {
  playerControllerRef = playerController;
  craftingOverlayEl = document.getElementById('crafting-overlay');
  craftingListEl = document.getElementById('crafting-recipes-list');
  btnCloseEl = document.getElementById('btn-close-crafting');

  if (btnCloseEl) {
    btnCloseEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCraftingMenu();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!isCraftingOpen) return;
    if (e.code === 'Escape' || (e.code === 'KeyE' && Date.now() - openedTimestamp > 350)) {
      e.stopPropagation();
      closeCraftingMenu();
    }
  }, true);
}

export function openCraftingMenu(gameContext) {
  if (!craftingOverlayEl) return;

  isCraftingOpen = true;
  openedTimestamp = Date.now();
  craftingOverlayEl.classList.add('visible');

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  renderCraftingMenu(gameContext);
}

let lastCraftingCloseTime = 0;

export function getLastCraftingCloseTime() {
  return lastCraftingCloseTime;
}

export function closeCraftingMenu() {
  if (!craftingOverlayEl) return;

  lastCraftingCloseTime = Date.now();
  isCraftingOpen = false;
  craftingOverlayEl.classList.remove('visible');

  if (playerControllerRef && playerControllerRef.controls) {
    setTimeout(() => {
      try {
        if (!isCraftingOpen) {
          playerControllerRef.controls.lock();
        }
      } catch (err) {}
    }, 60);
  }
}

export function isCraftingMenuOpen() {
  return isCraftingOpen;
}

function renderCraftingMenu(gameContext) {
  if (!craftingListEl) return;
  craftingListEl.innerHTML = '';

  // Atualizar cabeçalho de recursos disponíveis
  const resEnergyEl = document.getElementById('craft-res-energy');
  const resCopperEl = document.getElementById('craft-res-copper');
  const resPasteEl = document.getElementById('craft-res-paste');
  const resCrystalEl = document.getElementById('craft-res-crystal');

  if (resEnergyEl) resEnergyEl.textContent = inventory.getResource('energyCells');
  if (resCopperEl) resCopperEl.textContent = inventory.getResource('copperWires');
  if (resPasteEl) resPasteEl.textContent = inventory.getResource('thermalPastes');
  if (resCrystalEl) resCrystalEl.textContent = inventory.getResource('clockCrystals');

  // Agrupar receitas por tier (1..4)
  for (const tierDef of CRAFTING_TIERS) {
    const tier = tierDef.tier;

    const tierHeader = document.createElement('div');
    tierHeader.className = 'recipe-tier-header';
    tierHeader.innerHTML = `<span class="recipe-tier-title">Tier ${tier} — ${tierDef.name} ${tierDef.icon}</span>`;
    craftingListEl.appendChild(tierHeader);

    if (!isTierUnlocked(tier)) {
      const unlockBtn = document.createElement('button');
      unlockBtn.className = 'btn-craft tier-unlock';
      unlockBtn.innerHTML = `Unlock (💎 ${tierDef.unlockCost})`;
      unlockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cost = tierDef.unlockCost || 0;
        if (inventory.getResource('clockCrystals') >= cost) {
          inventory.consumeResource('clockCrystals', cost);
          unlockTier(tier);
          showBanner(`🔓 Tier ${tier} unlocked: ${tierDef.name}!`, '⚛️');
          renderCraftingMenu(gameContext);
        } else {
          showBanner('⚠️ Not enough crystals', '💎');
        }
      });
      craftingListEl.appendChild(unlockBtn);
      continue; // não renderiza receitas de tier ainda bloqueado
    }

    const tierRecipes = CRAFTING_RECIPES.filter(r => r.tier === tier);
    for (const recipe of tierRecipes) {
      craftingListEl.appendChild(buildRecipeCard(recipe, gameContext));
    }
  }
}

function buildRecipeCard(recipe, gameContext) {
  const card = document.createElement('div');
  card.className = 'recipe-card';

  // Em breve (stub Tier 4)
  if (recipe.comingSoon) {
    card.classList.add('coming-soon');
    card.innerHTML = `
      <div class="recipe-icon">${recipe.icon}</div>
      <div class="recipe-info">
        <div class="recipe-title">${recipe.title}</div>
        <div class="recipe-desc">${recipe.desc}</div>
      </div>
      <button class="btn-craft disabled">🔒 COMING SOON</button>
    `;
    return card;
  }

  // Blueprint (gate): só exibe se o blueprint foi desbloqueado
  if (recipe.blueprintGated && !isBlueprintUnlocked(recipe.id)) {
    card.classList.add('blueprint-gated');
    card.innerHTML = `
      <div class="recipe-icon">🔒</div>
      <div class="recipe-info">
        <div class="recipe-title">${recipe.title}</div>
        <div class="recipe-desc">Requires a blueprint to forge.</div>
      </div>
      <button class="btn-craft disabled">🔒 LOCKED</button>
    `;
    return card;
  }

  // Pré-requisitos (requires)
  const missingReqId = (recipe.requires || []).find(id => {
    const req = CRAFTING_RECIPES.find(r => r.id === id);
    return !req || !req.crafted;
  });
  if (missingReqId) {
    const req = CRAFTING_RECIPES.find(r => r.id === missingReqId);
    card.classList.add('locked');
    card.innerHTML = `
      <div class="recipe-icon">${recipe.icon}</div>
      <div class="recipe-info">
        <div class="recipe-title">${recipe.title}</div>
        <div class="recipe-desc">${recipe.desc}</div>
        <div class="recipe-cost">🔗 Requires: ${req ? req.title : missingReqId}</div>
      </div>
      <button class="btn-craft locked">PREREQUISITE</button>
    `;
    return card;
  }

  // Custo / afford
  let canAfford = true;
  const costBadges = [];
  const cost = recipe.cost || {};

  if (cost.copperWires) {
    const has = inventory.getResource('copperWires');
    const req = cost.copperWires;
    if (has < req) canAfford = false;
    costBadges.push(`<span class="cost-badge ${has >= req ? 'ok' : 'missing'}">🧵 ${has}/${req} Wires</span>`);
  }

  if (cost.energyCells) {
    const has = inventory.getResource('energyCells');
    const req = cost.energyCells;
    if (has < req) canAfford = false;
    costBadges.push(`<span class="cost-badge ${has >= req ? 'ok' : 'missing'}">🔋 ${has}/${req} Cells</span>`);
  }

  if (cost.thermalPastes) {
    const has = inventory.getResource('thermalPastes');
    const req = cost.thermalPastes;
    if (has < req) canAfford = false;
    costBadges.push(`<span class="cost-badge ${has >= req ? 'ok' : 'missing'}">🧪 ${has}/${req} Pastes</span>`);
  }

  if (cost.clockCrystals) {
    const has = inventory.getResource('clockCrystals');
    const req = cost.clockCrystals;
    if (has < req) canAfford = false;
    costBadges.push(`<span class="cost-badge ${has >= req ? 'ok' : 'missing'}">💎 ${has}/${req} Crystals</span>`);
  }

  const isCrafted = recipe.crafted && !recipe.repeatable;
  card.className = `recipe-card ${isCrafted ? 'crafted' : ''}`;
  card.innerHTML = `
    <div class="recipe-icon">${recipe.icon}</div>
    <div class="recipe-info">
      <div class="recipe-title">${recipe.title}</div>
      <div class="recipe-desc">${recipe.desc}</div>
      <div class="recipe-cost">${costBadges.join(' ')}</div>
    </div>
    <button class="btn-craft ${isCrafted ? 'disabled' : (canAfford ? 'ready' : 'locked')}">
      ${isCrafted ? '✔ CRAFTED' : (canAfford ? 'FORGE ⚡' : 'NOT ENOUGH RESOURCES')}
    </button>
  `;

  const btn = card.querySelector('.btn-craft');
  if (!isCrafted && canAfford) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      executeCraft(recipe, gameContext);
    });
  }

  return card;
}

function executeCraft(recipe, gameContext) {
  // Consumir recursos
  if (recipe.cost.copperWires) inventory.consumeResource('copperWires', recipe.cost.copperWires);
  if (recipe.cost.energyCells) inventory.consumeResource('energyCells', recipe.cost.energyCells);
  if (recipe.cost.thermalPastes) inventory.consumeResource('thermalPastes', recipe.cost.thermalPastes);
  if (recipe.cost.clockCrystals) inventory.consumeResource('clockCrystals', recipe.cost.clockCrystals);

  audioService.craftSuccess();
  applyCraftEffect(recipe.id, gameContext);
  if (!recipe.repeatable) recipe.crafted = true;
  renderCraftingMenu(gameContext);
}
