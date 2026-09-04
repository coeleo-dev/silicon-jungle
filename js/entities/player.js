/**
 * player.js — Controlador do Jogador em Primeira Pessoa
 * Integrado ao WorldService, WeaponSystem e AudioService.
 */
import { camera } from '../core/scene.js?v=20260821';
import { audioService } from '../core/AudioService.js?v=20260821';
import { sound } from '../core/audio.js?v=20260821';
import { worldService } from '../core/WorldService.js?v=20260821';
import { weaponSystem } from '../weapons/WeaponSystem.js?v=20260825';
import { inventory } from './inventory.js?v=20260912';
import { triggerInteraction, showBanner, triggerDamageFlash } from '../ui/hud.js?v=20260912';
import { CONFIG } from '../config/constants.js?v=20260821';
import { shouldAcceptAttack, createAttackInputState, onAttackPointerLock, onAttackButtonDown, onAttackButtonUp } from '../utils/attackGate.js?v=20260912';
import { buildingService } from '../building/BuildingService.js?v=20260914';
import { isCrateMenuOpen } from '../ui/crateUI.js?v=20260912';
import { resolvePlayerSpawn } from '../world/spawnResolver.js?v=20260821';
import { isDialogueOpen, getLastDialogueCloseTime } from '../ui/dialogue.js?v=20260821';
import { isCraftingMenuOpen, getLastCraftingCloseTime } from '../ui/crafting.js?v=20260912';
import { isInventoryOpen, toggleInventory, getLastInventoryCloseTime } from '../ui/inventoryUI.js?v=20260912';
import { isTradeMenuOpen, getLastTradeCloseTime } from '../ui/trade.js?v=20260821';
import { getActiveSlotId } from '../core/saveSystem.js?v=20260914';
import { getBiomeAt } from '../world/biomeMap.js?v=20260904';
import { moveModifiers } from '../world/biomeVisuals.js?v=20260904';

const _prevPlayerPos = new THREE.Vector3();

export class PlayerController {
  constructor(domElement, gameContext) {
    this.controls = new THREE.PointerLockControls(camera, domElement);
    this.gameContext = gameContext;

    // Alinhamento inicial em ponto livre (fora de prédios, árvores, rochas e carros)
    const desiredX = CONFIG.PLAYER?.INITIAL_POSITION?.x ?? 0;
    const desiredZ = CONFIG.PLAYER?.INITIAL_POSITION?.z ?? 30;
    const spawn = resolvePlayerSpawn(desiredX, desiredZ);
    const startY = spawn.y + (CONFIG.PLAYER?.EYE_HEIGHT ?? 1.8);
    camera.position.set(spawn.x, startY, spawn.z);

    this.keys = { forward: false, backward: false, left: false, right: false, sprint: false };
    this.verticalVelocity = 0;
    this.canJump = true;
    this.walkBobTimer = 0;
    this.lastFootstepTime = 0;

    // Efeitos de Status (Lentidão de Teia Laser e Dano)
    this.slowTimer = 0;
    this.slowMultiplier = 1.0;
    this.invulnerabilityTimer = 0;
    this.hasGameStarted = false;
    this.isDead = false;
    this.lockGrantedAt = 0;
    this.attackInput = createAttackInputState();
    this.camera = camera;

    this.initControls();
  }

  applyKnockback(dx, dz) {
    _prevPlayerPos.copy(camera.position);
    camera.position.x += dx;
    camera.position.z += dz;
    const col = worldService.checkPlayerCollision(camera.position, camera.position.y);
    if (col.collide) {
      camera.position.x = _prevPlayerPos.x;
      camera.position.z = _prevPlayerPos.z;
    }
  }

  /** Posição da câmera — o EntityRegistry passa o player como ctx do update. */
  get playerPos() {
    return camera.position;
  }

  die() {
    this.isDead = true;
    camera.rotation.z = -0.35;
    weaponSystem.weaponRig.position.y = -1.5;
    try {
      this.controls.unlock();
    } catch (e) {}
  }

  respawn() {
    this.isDead = false;
    camera.rotation.z = 0;
    weaponSystem.weaponRig.position.y = 0;
    this.verticalVelocity = 0;
    this.invulnerabilityTimer = 2.0;
  }

  applySlow(multiplier = 0.5, duration = 2.5) {
    this.slowMultiplier = multiplier;
    this.slowTimer = duration;
    showBanner('⚠️ Caught in a laser web! Speed -50%!', '🕸️');
  }

  takeDamage(amount) {
    if (this.isDead || this.invulnerabilityTimer > 0) return;
    this.invulnerabilityTimer = CONFIG.COMBAT.I_FRAME_DURATION; // I-frames
    audioService.play('playPlayerHurt');
    triggerDamageFlash();
    
    if (this.gameContext && typeof this.gameContext.takeDamage === 'function') {
      this.gameContext.takeDamage(amount);
    }
  }

  initControls() {
    const startOverlay = document.getElementById('start-overlay');
    const btnStart = document.getElementById('btn-start');
    const startBadgeText = document.getElementById('start-badge-text');
    const btnStartText = document.getElementById('btn-start-text');

    const startGame = (e) => {
      if (e) e.stopPropagation();
      if (!getActiveSlotId()) return;
      this.hasGameStarted = true;
      if (typeof audioService?.init === 'function') {
        audioService.init();
      } else if (typeof sound?.init === 'function') {
        sound.init();
      }
      this.controls.lock();
    };

    if (btnStart) btnStart.addEventListener('click', startGame);

    this.controls.addEventListener('lock', () => {
      this.lockGrantedAt = performance.now();
      this.attackInput = onAttackPointerLock(this.attackInput);
      if (startOverlay) {
        startOverlay.style.opacity = '0';
        setTimeout(() => {
          if (this.controls.isLocked) {
            startOverlay.style.display = 'none';
          }
        }, 300);
      }
    });

    this.controls.addEventListener('unlock', () => {
      if (this.isDead || (this.gameContext && this.gameContext.isGameOver)) return;
      if (isCraftingMenuOpen() || isDialogueOpen() || isInventoryOpen() || isTradeMenuOpen()) return;
      if (Date.now() - getLastCraftingCloseTime() < 450 || Date.now() - getLastDialogueCloseTime() < 450 || Date.now() - getLastInventoryCloseTime() < 450 || Date.now() - getLastTradeCloseTime() < 450) return;

      if (startOverlay && this.hasGameStarted) {
        if (startBadgeText) startBadgeText.textContent = '⏸️ PAUSED';
        if (btnStartText) btnStartText.textContent = 'RESUME';
        const fold = document.getElementById('controls-fold');
        if (fold) fold.open = false;
        const panel = startOverlay.querySelector('.start-panel');
        if (panel) panel.classList.add('is-paused');
        startOverlay.style.display = 'flex';
        setTimeout(() => startOverlay.style.opacity = '1', 10);
      }
    });

    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = true; break;
        case 'Space':
          if (this.canJump && this.controls.isLocked) {
            this.verticalVelocity = CONFIG.PLAYER.JUMP_VELOCITY;
            this.canJump = false;
            audioService.jump();
          }
          break;
        case 'KeyE':
          if (this.controls.isLocked) triggerInteraction();
          break;

        case 'KeyB':
          if (this.controls.isLocked) buildingService.toggleBuildMode();
          break;

        case 'KeyR':
          if (this.controls.isLocked && buildingService.isBuildMode()) buildingService.rotateGhost90();
          break;

        case 'BracketLeft':
          if (this.controls.isLocked && buildingService.isBuildMode()) buildingService.cycleType(-1);
          break;
        case 'BracketRight':
          if (this.controls.isLocked && buildingService.isBuildMode()) buildingService.cycleType(1);
          break;

        case 'KeyI': case 'Tab':
          e.preventDefault();
          toggleInventory(this.gameContext);
          break;

        case 'Digit1': case 'Numpad1':
          if (this.controls.isLocked && !buildingService.isBuildMode()) inventory.equipSlot(1);
          break;
        case 'Digit2': case 'Numpad2':
          if (this.controls.isLocked && !buildingService.isBuildMode()) inventory.equipSlot(2);
          break;
        case 'Digit3': case 'Numpad3':
          if (this.controls.isLocked && !buildingService.isBuildMode()) inventory.equipSlot(3);
          break;
        case 'Digit4': case 'Numpad4':
          if (this.controls.isLocked && !buildingService.isBuildMode()) inventory.equipSlot(4);
          break;
        case 'Digit5': case 'Numpad5':
          if (this.controls.isLocked && !buildingService.isBuildMode()) inventory.equipSlot(5);
          break;

        case 'KeyH':
          if (this.controls.isLocked) {
            const pasteCount = inventory.getResource('thermalPastes');
            if (pasteCount > 0) {
              inventory.consumeResource('thermalPastes', 1);
              if (this.gameContext && this.gameContext.restoreIntegrity) {
                this.gameContext.restoreIntegrity(35);
              }
              audioService.play('playHealThermalPaste');
              showBanner('🧪 Thermal paste applied! (+35% integrity repaired)', '💚');
            } else {
              showBanner('⚠️ No thermal paste in the pack! Harvest moss with the knife.', '🧪');
            }
          }
          break;

        case 'KeyL': case 'KeyF':
          if (this.controls.isLocked) inventory.toggleFlashlight();
          break;

        case 'KeyQ':
          if (this.controls.isLocked) inventory.cycleWeapon(-1);
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.sprint = false; break;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (this.isDead || (this.gameContext && this.gameContext.isGameOver)) return;
      if (isDialogueOpen() || isCraftingMenuOpen() || isInventoryOpen() || isTradeMenuOpen() || isCrateMenuOpen()) return;

      if (e.button === 0) {
        const attackEdge = onAttackButtonDown(this.attackInput);
        this.attackInput = attackEdge.state;

        if (!this.controls.isLocked) {
          if (this.hasGameStarted && !this.gameContext?.isGameOver) {
            try {
              this.controls.lock();
            } catch (err) {}
          }
          return;
        }

        if (!attackEdge.shouldFire) return;
        if (buildingService.isBuildMode()) {
          buildingService.tryPlace();
          return;
        }
        if (!shouldAcceptAttack({
          isLocked: this.controls.isLocked,
          now: performance.now(),
          lockGrantedAt: this.lockGrantedAt,
          buildMode: false
        })) return;
        weaponSystem.useActiveWeapon(inventory.currentWeaponId, this.gameContext);
      } else if (e.button === 2) {
        if (!this.controls.isLocked) return;
        if (buildingService.isBuildMode()) {
          buildingService.tryRemove();
          return;
        }
        triggerInteraction();
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.attackInput = onAttackButtonUp(this.attackInput);
      }
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('wheel', (e) => {
      if (this.isDead || !this.controls.isLocked) return;
      if (buildingService.isBuildMode()) {
        buildingService.cycleType(e.deltaY > 0 ? 1 : -1);
        return;
      }
      if (e.deltaY > 0) {
        inventory.cycleWeapon(1);
      } else if (e.deltaY < 0) {
        inventory.cycleWeapon(-1);
      }
    }, { passive: true });
  }

  update(delta, time, isOverclockActive) {
    if (this.isDead || !this.controls.isLocked) return;

    if (buildingService.isBuildMode()) {
      buildingService.tickGhost(camera, (x, z) => worldService.getHeight(x, z));
    }

    if (this.invulnerabilityTimer > 0) {
      this.invulnerabilityTimer -= delta;
    }

    if (this.slowTimer > 0) {
      this.slowTimer -= delta;
      if (this.slowTimer <= 0) {
        this.slowMultiplier = 1.0;
      }
    }

    const moveZ = (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0);
    const moveX = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);

    const baseSpeed = this.keys.sprint ? CONFIG.PLAYER.SPRINT_SPEED : CONFIG.PLAYER.WALK_SPEED;
    let currentSpeed = (isOverclockActive ? baseSpeed * CONFIG.PLAYER.OVERCLOCK_MULTIPLIER : baseSpeed) * delta;

    currentSpeed *= this.slowMultiplier;
    const biomeMods = moveModifiers(getBiomeAt(camera.position.x, camera.position.z));
    currentSpeed *= biomeMods.speedMul;

    if (moveZ !== 0 || moveX !== 0) {
      const len = Math.hypot(moveX, moveZ);
      const normX = moveX / len;
      const normZ = moveZ / len;

      _prevPlayerPos.copy(camera.position);

      this.controls.moveRight(normX * currentSpeed);
      this.controls.moveForward(normZ * currentSpeed);

      let col = worldService.checkPlayerCollision(camera.position, camera.position.y);
      if (col.collide) {
        camera.position.x = _prevPlayerPos.x;
        camera.position.z = _prevPlayerPos.z;
      } else {
        const stepDelta = col.floorHeight - camera.position.y;
        if (stepDelta > 0 && stepDelta <= 0.85 && this.canJump) {
          camera.position.y = col.floorHeight;
          this.verticalVelocity = 0;
        }
      }

      if (this.canJump) {
        this.walkBobTimer += delta * (this.keys.sprint ? 14 : 9);
        weaponSystem.weaponRig.position.y = Math.sin(this.walkBobTimer) * 0.03;
        weaponSystem.weaponRig.position.x = Math.cos(this.walkBobTimer * 0.5) * 0.02;

        if (time - this.lastFootstepTime > (this.keys.sprint ? 0.28 : 0.42)) {
          audioService.walkFootstep();
          this.lastFootstepTime = time;
        }
      }
    } else {
      weaponSystem.weaponRig.position.y = Math.sin(time * 2.0) * 0.008;
      weaponSystem.weaponRig.position.x = 0;
    }

    if ((biomeMods.windX || biomeMods.windZ) && (moveX !== 0 || moveZ !== 0)) {
      _prevPlayerPos.copy(camera.position);
      camera.position.x += biomeMods.windX * delta;
      camera.position.z += biomeMods.windZ * delta;
      const windCol = worldService.checkPlayerCollision(camera.position, camera.position.y);
      if (windCol.collide) {
        camera.position.x = _prevPlayerPos.x;
        camera.position.z = _prevPlayerPos.z;
      }
    }

    // Gravidade
    this.verticalVelocity -= CONFIG.PLAYER.GRAVITY * delta;
    camera.position.y += this.verticalVelocity * delta;

    // Piso seguro
    let ground = worldService.checkPlayerCollision(camera.position, camera.position.y);
    if (camera.position.y <= ground.floorHeight) {
      camera.position.y = ground.floorHeight;
      this.verticalVelocity = 0;
      this.canJump = true;
    }
  }
}
