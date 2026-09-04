/**
 * inventoryUI.js — Interface Gráfica da Mochila e Inventário do Explorador
 * Permite visualizar, usar consumíveis (cura e energia) e equipar armas via [I] ou [TAB].
 */
import { inventory } from '../entities/inventory.js?v=20260912';
import { CONFIG } from '../config/constants.js?v=20260821';
import { audioService } from '../core/AudioService.js?v=20260821';
import { showBanner } from './hud.js?v=20260912';

let inventoryOverlayEl = null;
let btnCloseEl = null;
let isInvOpen = false;
let lastInvCloseTime = 0;
let playerRef = null;

export function initInventoryUI(playerController) {
  playerRef = playerController;
  inventoryOverlayEl = document.getElementById('inventory-overlay');
  btnCloseEl = document.getElementById('btn-close-inventory');

  if (btnCloseEl) {
    btnCloseEl.addEventListener('click', (e) => {
      e.stopPropagation();
      closeInventory();
    });
  }

  // Prevenir propagação de cliques para evitar lock de ponteiro indesejado
  if (inventoryOverlayEl) {
    inventoryOverlayEl.addEventListener('click', (e) => {
      if (e.target === inventoryOverlayEl) {
        closeInventory();
      }
    });
  }
}

export function isInventoryOpen() {
  return isInvOpen;
}

export function getLastInventoryCloseTime() {
  return lastInvCloseTime;
}

export function toggleInventory(gameContext) {
  if (isInvOpen) {
    closeInventory();
  } else {
    openInventory(gameContext);
  }
}

export function openInventory(gameContext) {
  if (!inventoryOverlayEl) return;
  isInvOpen = true;
  inventoryOverlayEl.classList.add('visible');

  if (document.pointerLockElement) {
    document.exitPointerLock();
  }

  audioService.uiClick();
  renderInventory(gameContext);
}

export function closeInventory() {
  if (!inventoryOverlayEl || !isInvOpen) return;
  lastInvCloseTime = Date.now();
  isInvOpen = false;
  inventoryOverlayEl.classList.remove('visible');

  audioService.uiClick();

  // Devolver controle para o jogador se não houver outros modais
  if (playerRef && playerRef.controls && !playerRef.controls.isLocked) {
    setTimeout(() => {
      try {
        playerRef.controls.lock();
      } catch (err) {}
    }, 80);
  }
}

export function renderInventory(gameContext) {
  if (!inventoryOverlayEl) return;

  // 1. Atualizar Recursos
  const copperCount = inventory.getResource('copperWires');
  const pasteCount = inventory.getResource('thermalPastes');
  const crystalCount = inventory.getResource('clockCrystals');
  const cellCount = inventory.getResource('energyCells');

  const resCopperEl = document.getElementById('inv-res-copper');
  const resPasteEl = document.getElementById('inv-res-paste');
  const resCrystalEl = document.getElementById('inv-res-crystal');
  const resCellEl = document.getElementById('inv-res-cell');
  const resSiliconEl = document.getElementById('inv-res-silicon');
  const resSilverEl = document.getElementById('inv-res-silver');
  const resLithiumEl = document.getElementById('inv-res-lithium');
  const resElectrolyteEl = document.getElementById('inv-res-electrolyte');
  const resTicuEl = document.getElementById('inv-res-ticu');

  if (resCopperEl) resCopperEl.textContent = copperCount;
  if (resPasteEl) resPasteEl.textContent = pasteCount;
  if (resCrystalEl) resCrystalEl.textContent = crystalCount;
  if (resCellEl) resCellEl.textContent = cellCount;
  if (resSiliconEl) resSiliconEl.textContent = inventory.getResource('pureSilicon');
  if (resSilverEl) resSilverEl.textContent = inventory.getResource('silverCompound');
  if (resLithiumEl) resLithiumEl.textContent = inventory.getResource('lithiumCells');
  if (resElectrolyteEl) resElectrolyteEl.textContent = inventory.getResource('electrolyte');
  if (resTicuEl) resTicuEl.textContent = inventory.getResource('tiCuAlloy');

  const pcbCounts = [
    ['pcbFloor', 'inv-res-pcb-floor'],
    ['pcbWall', 'inv-res-pcb-wall'],
    ['pcbDoor', 'inv-res-pcb-door'],
    ['pcbStair', 'inv-res-pcb-stair'],
    ['pcbCrate', 'inv-res-pcb-crate'],
    ['pcbBench', 'inv-res-pcb-bench']
  ];
  for (let i = 0; i < pcbCounts.length; i++) {
    const el = document.getElementById(pcbCounts[i][1]);
    if (el) el.textContent = inventory.getResource(pcbCounts[i][0]);
  }

  // Botões de Ação de Recursos
  const btnUsePaste = document.getElementById('btn-use-paste');
  const btnUseCell = document.getElementById('btn-use-cell');

  if (btnUsePaste) {
    btnUsePaste.disabled = pasteCount <= 0;
    btnUsePaste.onclick = (e) => {
      e.stopPropagation();
      if (inventory.consumeResource('thermalPastes', 1)) {
        if (gameContext?.restoreIntegrity) {
          gameContext.restoreIntegrity(35);
        }
        audioService.powerUp();
        showBanner('🧪 Thermal paste applied (+35% integrity)', '🛡️');
        renderInventory(gameContext);
      }
    };
  }

  if (btnUseCell) {
    btnUseCell.disabled = cellCount <= 0;
    btnUseCell.onclick = (e) => {
      e.stopPropagation();
      if (inventory.consumeResource('energyCells', 1)) {
        if (gameContext?.restoreEnergy) {
          gameContext.restoreEnergy(45);
        }
        audioService.coreCollect();
        showBanner('🔋 Energy cell charged (+45% data energy)', '⚡');
        renderInventory(gameContext);
      }
    };
  }

  // 2. Lista de Armas & Equipamentos
  const weaponsListEl = document.getElementById('inv-weapons-list');
  if (weaponsListEl) {
    weaponsListEl.innerHTML = '';

    const allWeapons = [
      { id: CONFIG.WEAPONS.KNIFE.ID, name: CONFIG.WEAPONS.KNIFE.NAME, slot: 1, icon: '🔪', desc: `Damage: ${CONFIG.WEAPONS.KNIFE.DAMAGE} | Short range | Cut webs` },
      { id: CONFIG.WEAPONS.FLASHLIGHT.ID, name: CONFIG.WEAPONS.FLASHLIGHT.NAME, slot: 2, icon: '🔦', desc: 'Range: 60m | Light up ruins' },
      { id: CONFIG.WEAPONS.PLASMA_PISTOL.ID, name: CONFIG.WEAPONS.PLASMA_PISTOL.NAME, slot: 3, icon: '🔫', desc: `Damage: ${CONFIG.WEAPONS.PLASMA_PISTOL.DAMAGE} | Rapid plasma shots` },
      { id: CONFIG.WEAPONS.ARC_SHOTGUN.ID, name: CONFIG.WEAPONS.ARC_SHOTGUN.NAME, slot: 4, icon: '⚡', desc: `Damage: ${CONFIG.WEAPONS.ARC_SHOTGUN.PELLETS}x${CONFIG.WEAPONS.ARC_SHOTGUN.DAMAGE_PER_PELLET} | Arc burst` },
      { id: CONFIG.WEAPONS.BUS_RIFLE.ID, name: CONFIG.WEAPONS.BUS_RIFLE.NAME, slot: 5, icon: '💥', desc: `Damage: ${CONFIG.WEAPONS.BUS_RIFLE.DAMAGE} | Armor-piercing rifle` }
    ];

    allWeapons.forEach(w => {
      const isUnlocked = inventory.unlockedWeapons.includes(w.id);
      if (!isUnlocked) return;

      const isEquipped = inventory.currentWeaponId === w.id;

      const item = document.createElement('div');
      item.className = `inv-weapon-item ${isEquipped ? 'equipped' : ''}`;

      item.innerHTML = `
        <div class="inv-weapon-left">
          <div class="inv-weapon-icon">${w.icon}</div>
          <div>
            <div class="inv-weapon-name">${w.name} ${isEquipped ? '<span style="color:#38bdf8; font-size:11px;">[EQUIPPED]</span>' : ''}</div>
            <div class="inv-weapon-stats">${w.desc}</div>
          </div>
        </div>
        <button class="btn-equip-wep ${isEquipped ? 'active' : ''}">${isEquipped ? 'EQUIPPED' : 'EQUIP'}</button>
      `;

      const btnEquip = item.querySelector('.btn-equip-wep');
      btnEquip.addEventListener('click', (e) => {
        e.stopPropagation();
        inventory.equipSlot(w.slot);
        renderInventory(gameContext);
      });

      weaponsListEl.appendChild(item);
    });
  }

  // 3. Status e Diagnóstico
  const statEnergyEl = document.getElementById('inv-stat-energy');
  const statIntegrityEl = document.getElementById('inv-stat-integrity');
  const statCapdogEl = document.getElementById('inv-stat-capdog');

  if (statEnergyEl && gameContext?.dataEnergy !== undefined) {
    statEnergyEl.textContent = `${Math.round(gameContext.dataEnergy)}%`;
  }
  if (statIntegrityEl && gameContext?.circuitIntegrity !== undefined) {
    statIntegrityEl.textContent = `${Math.round(gameContext.circuitIntegrity)}%`;
  }
  if (statCapdogEl) {
    const isTamed = gameContext?.capdog?.isTamed;
    statCapdogEl.textContent = isTamed ? `TAMED (LV.${gameContext?.capdog?.level || 1})` : 'WILD / AWAITING TAME';
  }
}
