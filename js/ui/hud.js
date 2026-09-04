import { camera } from '../core/scene.js?v=20260821';
import { initPerfOverlay, perfOverlayEnabled } from '../core/perfStats.js?v=20260829';
import { interactiveRegistry } from '../core/InteractiveRegistry.js?v=20260821';
import { capdogInstance } from '../entities/companions/CapdogCompanion.js?v=20260912';
import { inventory } from '../entities/inventory.js?v=20260912';
import { eventBus } from '../core/EventBus.js?v=20260821';
import { CONFIG } from '../config/constants.js?v=20260821';
import { campaign } from '../core/campaign.js?v=20260901';

const _tempWorldPos = new THREE.Vector3();

const energyBarEl = document.getElementById('energy-bar');
const energyValEl = document.getElementById('energy-val');
const integrityBarEl = document.getElementById('integrity-bar');
const integrityValEl = document.getElementById('integrity-val');
const collectedValEl = document.getElementById('collected-val');
const statusCoordsEl = document.getElementById('status-coords');
const targetTooltipEl = document.getElementById('target-tooltip');
const actionBannerEl = document.getElementById('action-banner');
const bannerTextEl = document.getElementById('banner-text');
const reticleWrapEl = document.getElementById('reticle-wrap');
const hitmarkerEl = document.getElementById('hitmarker');
const speedLinesEl = document.getElementById('speed-lines');
const damageOverlayEl = document.getElementById('damage-flash-overlay');
const fpsBadgeEl = document.getElementById('fps-badge');
const fpsValEl = document.getElementById('fps-val');
const fpsMsEl = document.getElementById('fps-ms');
let perfDetailEl = document.getElementById('perf-detail');
let damageFlashTimeout = null;

export function triggerDamageFlash() {
  if (!damageOverlayEl) return;
  damageOverlayEl.classList.add('active');
  if (damageFlashTimeout) clearTimeout(damageFlashTimeout);
  damageFlashTimeout = setTimeout(() => {
    damageOverlayEl.classList.remove('active');
  }, 240);
}

// Inscrição no EventBus para desacoplamento de UI
eventBus.on('ui:banner', ({ text, icon = '⚡' } = {}) => {
  showBanner(text, icon);
});
eventBus.on('combat:hit', () => {
  showHitmarker();
});
eventBus.on('player:damaged', () => {
  triggerDamageFlash();
});

// Mini Resources HUD
const miniCopperEl = document.getElementById('mini-copper-count');
const miniPasteEl = document.getElementById('mini-paste-count');
const miniCrystalEl = document.getElementById('mini-crystal-count');
const miniEnergyEl = document.getElementById('mini-energy-count');

// Capdog HUD Widget
const capdogHudCardEl = document.getElementById('capdog-hud-card');
const capdogLevelValEl = document.getElementById('capdog-level-val');
const capdogHpValEl = document.getElementById('capdog-hp-val');
const capdogHpBarEl = document.getElementById('capdog-hp-bar');

// Elementos de HUD de Arma
const activeWeaponNameEl = document.getElementById('active-weapon-name');
const activeWeaponModeEl = document.getElementById('active-weapon-mode');
const weaponSlotElements = {
  1: document.getElementById('slot-1'),
  2: document.getElementById('slot-2'),
  3: document.getElementById('slot-3'),
  4: document.getElementById('slot-4'),
  5: document.getElementById('slot-5')
};

let bannerTimeout = null;
export let enemyTargetMeshes = [];

export function addEnemyTargetMeshes(meshes) {
  enemyTargetMeshes = enemyTargetMeshes.concat(meshes);
}

export function setEnemyTargetMeshes(meshes) {
  enemyTargetMeshes = meshes;
}

export function showBanner(text, icon = '⚡') {
  if (!actionBannerEl || !bannerTextEl) return;
  bannerTextEl.textContent = `${icon} ${text}`;
  actionBannerEl.classList.add('visible');

  if (bannerTimeout) clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => {
    actionBannerEl.classList.remove('visible');
  }, 2600);
}

export function showHitmarker() {
  if (!hitmarkerEl) return;
  hitmarkerEl.classList.add('active');
  setTimeout(() => {
    hitmarkerEl.classList.remove('active');
  }, 100);
}

export function updateCollectedCount(count) {
  if (collectedValEl) {
    collectedValEl.textContent = `${count}`;
  }
}

export function setSpeedLines(active) {
  if (!speedLinesEl) return;
  speedLinesEl.style.opacity = active ? '0.75' : '0';
}

export function updateWeaponHUD(weaponConfig) {
  if (!weaponConfig) return;

  if (activeWeaponNameEl) {
    activeWeaponNameEl.textContent = `${weaponConfig.ICON} ${weaponConfig.NAME.toUpperCase()}`;
  }

  if (activeWeaponModeEl) {
    const W = CONFIG.WEAPONS;
    if (weaponConfig.ID === 'knife') {
      activeWeaponModeEl.textContent = `[LMB] : MELEE STRIKE (${W.KNIFE.DAMAGE} DMG / CUT VINES AND WEBS)`;
    } else if (weaponConfig.ID === 'flashlight') {
      activeWeaponModeEl.textContent = '[LMB / L / F] : TOGGLE LED BEAM';
    } else if (weaponConfig.ID === 'plasma_pistol') {
      activeWeaponModeEl.textContent = `[LMB] : PLASMA SHOT (${W.PLASMA_PISTOL.DAMAGE} DMG)`;
    } else if (weaponConfig.ID === 'arc_shotgun') {
      activeWeaponModeEl.textContent = `[LMB] : ARC SPREAD (${W.ARC_SHOTGUN.PELLETS}x${W.ARC_SHOTGUN.DAMAGE_PER_PELLET} DMG)`;
    } else if (weaponConfig.ID === 'bus_rifle') {
      activeWeaponModeEl.textContent = `[LMB] : PIERCING LASER (${W.BUS_RIFLE.DAMAGE} DMG)`;
    }
  }

  for (let s = 1; s <= 5; s++) {
    const el = weaponSlotElements[s];
    if (el) {
      if (s === weaponConfig.SLOT) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    }
  }
}

const interactionRaycaster = new THREE.Raycaster();
const screenCenter = new THREE.Vector2(0, 0);
export let currentLookedInteractable = null;
let raycastThrottleCounter = 0;

let fpsTimer = 0;
let fpsFrameCount = 0;
let smoothedFps = 60;
let fpsMin1s = Infinity;

export function getSmoothedFps() {
  return smoothedFps;
}

export function initHudPerf() {
  initPerfOverlay();
  if (perfOverlayEnabled && !perfDetailEl) {
    perfDetailEl = document.createElement('div');
    perfDetailEl.id = 'perf-detail';
    perfDetailEl.className = 'perf-detail';
    if (fpsBadgeEl && fpsBadgeEl.parentElement) {
      fpsBadgeEl.parentElement.appendChild(perfDetailEl);
    }
  }
}

export function applyPerfSnapshot(snap) {
  if (!snap || !perfOverlayEnabled || !perfDetailEl) return;
  perfDetailEl.style.display = 'block';
  const lights = snap.lights != null ? snap.lights : '?';
  perfDetailEl.textContent =
    `avg ${snap.avg} · min ${snap.min} · ${snap.calls} dc · ${Math.round(snap.tris / 1000)}k tris · ${lights} pl`;
}

export function updateCampaignHUD() {
  const buses = campaign?.buses || {};
  for (const id of ['atx', 'dimm', 'io', 'heatsink']) {
    const el = document.getElementById(`bus-icon-${id}`);
    if (!el) continue;
    el.classList.toggle('is-on', buses[id] === true);
  }
}

export function updateHUD(dataEnergy, circuitIntegrity, isOverclockActive, delta = 0.016) {
  // Cálculo de FPS Real e Frame Time em Milissegundos
  fpsFrameCount++;
  fpsTimer += delta;
  const instantFps = delta > 0 ? 1 / delta : 0;
  if (instantFps < fpsMin1s) fpsMin1s = instantFps;

  if (fpsTimer >= 0.2) {
    smoothedFps = Math.round(fpsFrameCount / fpsTimer);
    const frameMs = (delta * 1000).toFixed(1);
    fpsFrameCount = 0;
    fpsTimer = 0;

    if (fpsValEl) {
      fpsValEl.textContent = smoothedFps;
    }
    if (fpsMsEl) {
      fpsMsEl.textContent = `${frameMs} ms`;
    }
    if (fpsBadgeEl) {
      if (smoothedFps >= 50) {
        fpsBadgeEl.className = 'fps-badge high';
      } else if (smoothedFps >= 28) {
        fpsBadgeEl.className = 'fps-badge mid';
      } else {
        fpsBadgeEl.className = 'fps-badge low';
      }
    }
    if (perfOverlayEnabled && fpsMsEl) {
      const minFps = fpsMin1s === Infinity ? smoothedFps : Math.round(fpsMin1s);
      fpsMsEl.textContent = `${frameMs} ms · min ${minFps}`;
      fpsMin1s = Infinity;
    }
  }

  if (energyBarEl) energyBarEl.style.width = `${dataEnergy.toFixed(1)}%`;
  if (energyValEl) energyValEl.textContent = `${Math.round(dataEnergy)}%`;
  if (integrityBarEl) integrityBarEl.style.width = `${circuitIntegrity.toFixed(1)}%`;
  if (integrityValEl) integrityValEl.textContent = `${Math.round(circuitIntegrity)}%`;

  if (energyBarEl) {
    if (dataEnergy < 20) {
      energyBarEl.classList.add('low-warning');
    } else {
      energyBarEl.classList.remove('low-warning');
    }
  }

  if (statusCoordsEl) {
    statusCoordsEl.textContent = `POS: X:${camera.position.x.toFixed(1)} | Z:${camera.position.z.toFixed(1)} // ${isOverclockActive ? 'OVERCLOCK ACTIVE ⚡' : 'STATUS: NORMAL'}`;
  }

  // Atualizar Mini-Barra de Recursos ao Vivo
  if (miniCopperEl) miniCopperEl.textContent = inventory.getResource('copperWires');
  if (miniPasteEl) miniPasteEl.textContent = inventory.getResource('thermalPastes');
  if (miniCrystalEl) miniCrystalEl.textContent = inventory.getResource('clockCrystals');
  if (miniEnergyEl) miniEnergyEl.textContent = inventory.getResource('energyCells');

  updateCampaignHUD();

  // Atualizar Status do Capdog Companion
  if (capdogInstance && capdogInstance.isTamed && capdogHudCardEl) {
    capdogHudCardEl.style.display = 'flex';
    if (capdogLevelValEl) capdogLevelValEl.textContent = capdogInstance.level;
    if (capdogHpValEl) capdogHpValEl.textContent = `${Math.round(capdogInstance.hp)} / ${capdogInstance.maxHp} HP`;
    if (capdogHpBarEl) {
      const pct = Math.max(0, Math.min(100, (capdogInstance.hp / capdogInstance.maxHp) * 100));
      capdogHpBarEl.style.width = `${pct}%`;
    }
  }

  // Throttle raycast to every 2 frames
  raycastThrottleCounter++;
  if (raycastThrottleCounter % 2 !== 0) return;

  interactionRaycaster.setFromCamera(screenCenter, camera);
  const candidates = interactiveRegistry.getNearby(camera.position, 16.0);

  // 1. PRIMEIRA PRIORIDADE: Mirando diretamente em Objeto Interativo Próximo
  const interactIntersects = interactionRaycaster.intersectObjects(candidates, false);
  if (interactIntersects.length > 0 && interactIntersects[0].distance < 14.0) {
    const obj = interactIntersects[0].object;
    if (reticleWrapEl) reticleWrapEl.className = 'reticle-wrap target-interact';
    if (targetTooltipEl) {
      const promptStr = (obj.userData && obj.userData.getPrompt) 
        ? obj.userData.getPrompt() 
        : (obj.userData && obj.userData.prompt ? obj.userData.prompt : '[E] INTERACT');
      targetTooltipEl.textContent = promptStr;
      targetTooltipEl.className = 'visible interact';
    }
    currentLookedInteractable = obj;
    return;
  }

  // 2. SEGUNDA PRIORIDADE: Mirando em Inimigo
  if (enemyTargetMeshes && enemyTargetMeshes.length > 0) {
    const enemyIntersects = interactionRaycaster.intersectObjects(enemyTargetMeshes, false);
    if (enemyIntersects.length > 0 && enemyIntersects[0].distance < 45) {
      const hitObj = enemyIntersects[0].object;
      const isMinion = hitObj.userData && hitObj.userData.isMinion;
      if (reticleWrapEl) reticleWrapEl.className = 'reticle-wrap target-enemy';
      if (targetTooltipEl) {
        targetTooltipEl.textContent = isMinion ? 'TARGET: PHENOM SENTINEL [FRONT ARMOR — FLANK]' : 'TARGET: SPIDER-BOT [CLICK TO ATTACK]';
        targetTooltipEl.className = 'visible enemy';
      }
      currentLookedInteractable = null;
      return;
    }
  }

  // 3. TERCEIRA PRIORIDADE: Proximidade com Objeto Interativo Próximo (dentro de 4 metros)
  let closestObj = null;
  let closestObjDist = 4.2;
  for (let i = 0; i < candidates.length; i++) {
    const obj = candidates[i];
    obj.getWorldPosition(_tempWorldPos);
    const d = camera.position.distanceTo(_tempWorldPos);
    if (d < closestObjDist) {
      closestObjDist = d;
      closestObj = obj;
    }
  }

  if (closestObj) {
    if (reticleWrapEl) reticleWrapEl.className = 'reticle-wrap target-interact';
    if (targetTooltipEl) {
      const promptStr = (closestObj.userData && closestObj.userData.getPrompt) 
        ? closestObj.userData.getPrompt() 
        : (closestObj.userData && closestObj.userData.prompt ? closestObj.userData.prompt : '[E] INTERACT');
      targetTooltipEl.textContent = promptStr;
      targetTooltipEl.className = 'visible interact';
    }
    currentLookedInteractable = closestObj;
    return;
  }

  // 4. Padrão
  if (reticleWrapEl) reticleWrapEl.className = 'reticle-wrap';
  if (targetTooltipEl) targetTooltipEl.className = '';
  currentLookedInteractable = null;
}

export function triggerInteraction() {
  if (currentLookedInteractable && currentLookedInteractable.userData && currentLookedInteractable.userData.action) {
    currentLookedInteractable.userData.action();
    return;
  }

  const candidates = interactiveRegistry.getNearby(camera.position, 6.0);
  let nearbyObj = null;
  let nearbyDist = 4.5;
  for (let i = 0; i < candidates.length; i++) {
    const obj = candidates[i];
    obj.getWorldPosition(_tempWorldPos);
    const d = camera.position.distanceTo(_tempWorldPos);
    if (d < nearbyDist && obj.userData && obj.userData.action) {
      nearbyDist = d;
      nearbyObj = obj;
    }
  }

  if (nearbyObj) {
    nearbyObj.userData.action();
  }
}
