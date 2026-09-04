/**
 * trade.js — Comércio NPC (Bip o Ferreiro) — Fase 4 / Onda A
 * Overlay de troca de materiais/blueprints por Cristais de Clock.
 * Espelha o ciclo de overlay + pointer-lock de crafting.js.
 * NÃO importa crafting.js / TransistorNPC.js / player.js (evita ciclo).
 */
import { inventory } from '../entities/inventory.js?v=20260912';
import { progression, unlockBlueprint } from '../core/craftingDomain.js?v=20260912';
import { showBanner } from './hud.js?v=20260912';
import { audioService } from '../core/AudioService.js?v=20260821';

export const TRADE_STOCK = [
  // jogador VENDE materiais -> recebe cristais
  { id: 'sell_copper', kind: 'sell', label: 'Sell 6× Copper Wires',    icon: '🧵', cost: { copperWires: 6 },  reward: { clockCrystals: 1 } },
  { id: 'sell_paste',  kind: 'sell', label: 'Sell 2× Thermal Paste',    icon: '🧪', cost: { thermalPastes: 2 }, reward: { clockCrystals: 1 } },
  { id: 'sell_cell',   kind: 'sell', label: 'Sell 1× Energy Cell', icon: '🔋', cost: { energyCells: 1 },  reward: { clockCrystals: 2 } },
  // jogador COMPRA materiais com cristais
  { id: 'buy_copper',  kind: 'buy', label: 'Buy 6× Copper Wires',    icon: '🧵', cost: { clockCrystals: 2 }, reward: { copperWires: 6 } },
  { id: 'buy_paste',   kind: 'buy', label: 'Buy 2× Thermal Paste',    icon: '🧪', cost: { clockCrystals: 2 }, reward: { thermalPastes: 2 } },
  { id: 'buy_cell',    kind: 'buy', label: 'Buy 1× Energy Cell', icon: '🔋', cost: { clockCrystals: 3 }, reward: { energyCells: 1 } },
  // blueprint
  { id: 'bp_emp_grenade', kind: 'blueprint', label: 'Blueprint: EMP Grenade', icon: '📜', cost: { clockCrystals: 8 }, reward: { blueprint: 'emp_grenade' } }
];

const RESOURCE_META = {
  copperWires:   { icon: '🧵', name: 'Copper Wires' },
  thermalPastes: { icon: '🧪', name: 'Thermal Paste' },
  energyCells:   { icon: '🔋', name: 'Energy Cell' },
  clockCrystals: { icon: '💎', name: 'Clock Crystals' }
};

let tradeOverlayEl = null;
let tradeListEl = null;
let tradeTitleEl = null;
let tradeCrystalEl = null;
let btnCloseEl = null;
let tradeMenuOpen = false;
let lastTradeCloseTime = 0;
let playerControllerRef = null;
let currentNpcName = '';
let currentGameContext = null;

export function initTradeUI(playerController) {
  playerControllerRef = playerController;
  tradeOverlayEl = document.getElementById('trade-overlay');
  tradeListEl = document.getElementById('trade-list');
  tradeTitleEl = document.getElementById('trade-title');
  tradeCrystalEl = document.getElementById('trade-crystals');
  btnCloseEl = document.getElementById('btn-close-trade');

  if (btnCloseEl) {
    btnCloseEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTradeMenu();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!tradeMenuOpen) return;
    if (e.code === 'Escape') {
      e.stopPropagation();
      closeTradeMenu();
    }
  }, true);
}

export function openTradeMenu(npcName, gameContext) {
  if (!tradeOverlayEl) return;

  currentNpcName = npcName || 'Bip the Smith';
  currentGameContext = gameContext || null;
  tradeMenuOpen = true;
  tradeOverlayEl.classList.add('visible');

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  audioService.uiClick();
  renderTradeMenu(currentNpcName, currentGameContext);
}

export function closeTradeMenu() {
  if (!tradeOverlayEl) return;

  lastTradeCloseTime = Date.now();
  tradeMenuOpen = false;
  tradeOverlayEl.classList.remove('visible');

  if (playerControllerRef && playerControllerRef.controls) {
    setTimeout(() => {
      try {
        if (!tradeMenuOpen) {
          playerControllerRef.controls.lock();
        }
      } catch (err) {}
    }, 60);
  }
}

export function isTradeMenuOpen() {
  return tradeMenuOpen;
}

export function getLastTradeCloseTime() {
  return lastTradeCloseTime;
}

export function renderTradeMenu(npcName, gameContext) {
  if (!tradeOverlayEl) return;

  if (tradeTitleEl) tradeTitleEl.textContent = `🔧 TRADE — ${(npcName || '').toUpperCase()}`;
  if (tradeCrystalEl) tradeCrystalEl.textContent = inventory.getResource('clockCrystals');

  if (!tradeListEl) return;
  tradeListEl.innerHTML = '';

  TRADE_STOCK.forEach(offer => {
    const card = document.createElement('div');
    card.className = `trade-card ${offer.kind}`;

    let canAfford = true;
    const costBadges = [];
    for (const [key, amount] of Object.entries(offer.cost)) {
      const has = inventory.getResource(key);
      const meta = RESOURCE_META[key] || { icon: '🔹', name: key };
      if (has < amount) canAfford = false;
      costBadges.push(`<span class="cost-badge ${has >= amount ? 'ok' : 'missing'}">${meta.icon} ${has}/${amount}</span>`);
    }

    const isOwnedBlueprint = offer.kind === 'blueprint'
      && progression.unlockedBlueprints.includes(offer.reward.blueprint);

    let rewardText = '';
    if (offer.reward.blueprint) {
      rewardText = '📜 Blueprint';
    } else {
      const rewardBadges = [];
      for (const [key, amount] of Object.entries(offer.reward)) {
        const meta = RESOURCE_META[key] || { icon: '🔹', name: key };
        rewardBadges.push(`${meta.icon} ${amount} ${meta.name}`);
      }
      rewardText = rewardBadges.join(' + ');
    }

    const actionLabel = offer.kind === 'sell' ? 'SELL' : (offer.kind === 'buy' ? 'BUY' : 'GET');
    const flowLabel = offer.kind === 'sell' ? '→ You receive' : '→ You pay';
    const isDisabled = !canAfford || isOwnedBlueprint;

    card.innerHTML = `
      <div class="trade-icon">${offer.icon}</div>
      <div class="trade-info">
        <div class="trade-label">${offer.label}</div>
        <div class="trade-cost">${costBadges.join(' ')}</div>
        <div class="trade-reward">${flowLabel}: ${rewardText}</div>
      </div>
      <button class="btn-trade ${isDisabled ? 'locked' : 'ready'}">${isOwnedBlueprint ? '✔ OWNED' : actionLabel}</button>
    `;

    const btn = card.querySelector('.btn-trade');
    if (!isDisabled) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        executeTrade(offer, gameContext);
      });
    }

    tradeListEl.appendChild(card);
  });
}

export function executeTrade(offer, gameContext) {
  // 1. valida custo
  for (const [key, amount] of Object.entries(offer.cost)) {
    if (inventory.getResource(key) < amount) {
      showBanner('⚠️ Not enough resources', '💎');
      return;
    }
  }

  // 2. consome custo
  for (const [key, amount] of Object.entries(offer.cost)) {
    inventory.consumeResource(key, amount);
  }

  // 3. aplica reward
  if (offer.reward.blueprint) {
    unlockBlueprint(offer.reward.blueprint);
    audioService.uiClick();
    showBanner(`📜 Blueprint acquired: ${offer.reward.blueprint}!`, '📜');
  } else {
    for (const [key, amount] of Object.entries(offer.reward)) {
      inventory.addResource(key, amount);
    }
    audioService.uiClick();
    showBanner(`🔁 Trade complete: ${offer.label}!`, '💎');
  }

  // 4. re-render
  renderTradeMenu(currentNpcName, gameContext || currentGameContext);
}
