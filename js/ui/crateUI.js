/**
 * UI dois painéis: recursos do jogador ↔ inventário da caixa PCB.
 */
import { inventory } from '../entities/inventory.js?v=20260912';
import { audioService } from '../core/AudioService.js?v=20260821';
import { emptyPieceInventory } from '../building/buildingOps.js?v=20260912';

const TRANSFER_KEYS = [
  ['copperWires', 'Wires'],
  ['clockCrystals', 'Crystals'],
  ['thermalPastes', 'Pastes'],
  ['energyCells', 'Cells'],
  ['pcbFloor', 'Floor'],
  ['pcbWall', 'Wall'],
  ['pcbDoor', 'Door'],
  ['pcbStair', 'Stair'],
  ['pcbCrate', 'Crate'],
  ['pcbBench', 'Bench']
];

let overlayEl = null;
let isOpen = false;
let lastClose = 0;
let playerRef = null;
let currentRecord = null;

export function initCrateUI(playerController) {
  playerRef = playerController;
  overlayEl = document.getElementById('crate-overlay');
  const btn = document.getElementById('btn-close-crate');
  if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); closeCrateMenu(); });
  if (overlayEl) {
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) closeCrateMenu();
    });
  }
  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.code === 'Escape' || e.code === 'KeyE') {
      e.preventDefault();
      closeCrateMenu();
    }
  });
}

export function isCrateMenuOpen() {
  return isOpen;
}

export function getLastCrateCloseTime() {
  return lastClose;
}

export function openCrateMenu(record) {
  if (!overlayEl || !record) return;
  currentRecord = record;
  if (!record.inventory) record.inventory = emptyPieceInventory();
  isOpen = true;
  overlayEl.classList.add('visible');
  if (document.pointerLockElement) document.exitPointerLock();
  audioService.uiClick();
  renderCrate();
}

export function closeCrateMenu() {
  if (!overlayEl || !isOpen) return;
  lastClose = Date.now();
  isOpen = false;
  overlayEl.classList.remove('visible');
  currentRecord = null;
  audioService.uiClick();
  if (playerRef && playerRef.controls && !playerRef.controls.isLocked) {
    setTimeout(() => {
      try { playerRef.controls.lock(); } catch (e) { /* ignore */ }
    }, 80);
  }
}

function move(key, dir) {
  if (!currentRecord) return;
  const box = currentRecord.inventory;
  if (dir > 0) {
    if (inventory.getResource(key) < 1) return;
    if (!inventory.consumeResource(key, 1)) return;
    box[key] = (box[key] || 0) + 1;
  } else {
    if ((box[key] || 0) < 1) return;
    box[key] -= 1;
    inventory.addResource(key, 1);
  }
  audioService.uiClick();
  renderCrate();
}

function renderCrate() {
  const left = document.getElementById('crate-player-list');
  const right = document.getElementById('crate-box-list');
  if (!left || !right || !currentRecord) return;
  left.innerHTML = '';
  right.innerHTML = '';
  for (let i = 0; i < TRANSFER_KEYS.length; i++) {
    const [key, label] = TRANSFER_KEYS[i];
    left.appendChild(row(label, inventory.getResource(key), () => move(key, 1), '»'));
    right.appendChild(row(label, currentRecord.inventory[key] || 0, () => move(key, -1), '«'));
  }
}

function row(label, count, onClick, arrow) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'crate-row';
  el.innerHTML = `<span>${label}</span><b>${count}</b><span class="crate-arrow">${arrow}</span>`;
  el.disabled = count <= 0;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}
