/**
 * main.js — Ponto de Entrada Principal & Game Loop do The Silicon Jungle
 * Orquestrador desacoplado que integra Core Services, EntityRegistry, CombatSystem e World.
 */
import { scene, camera, renderer } from './core/scene.js?v=20260821';
import { applyPixelRatio } from './config/quality.js?v=20260827';
import { setupLighting, updateAtmosphericLighting, updateShadowFollow, triggerLightningFlash } from './core/lighting.js?v=20260911';
import { initAdaptiveQuality, tickAdaptiveQuality } from './core/adaptiveQuality.js?v=20260827';
import { tickPerfStats } from './core/perfStats.js?v=20260829';
import { ensurePerfCounters } from './core/perfCounters.js?v=20260912';
import { audioService } from './core/AudioService.js?v=20260821';
import { entityRegistry } from './core/EntityRegistry.js?v=20260830';

import { getCollectedCount } from './world/collectibles.js?v=20260912';
import { WorldBootstrap } from './world/WorldBootstrap.js?v=20260912';
import { tickWorldClock, worldClock, isNight } from './world/worldClock.js?v=20260911';
import {
  tickStormMachine,
  tickLightningBolt,
  strikeHitsPlayer,
  STORM_STRIKE_DAMAGE,
  STORM_KNOCKBACK
} from './world/stormWeather.js?v=20260910';
import {
  shouldSpawnNightPatrol,
  shouldDespawnNightPatrol,
  pickNightPatrolAnchor,
  isNightCombat
} from './world/nightPatrol.js?v=20260910';
import { resolveEntitySpawn, resolvePlayerSpawn } from './world/spawnResolver.js?v=20260821';

import { weaponSystem } from './weapons/WeaponSystem.js?v=20260825';
import { inventory } from './entities/inventory.js?v=20260912';
import { SpiderBotEntity, spiderBots } from './entities/enemies/SpiderBotEntity.js?v=20260830';
import { SentinelEntity } from './entities/enemies/SentinelEntity.js?v=20260830';
import { CapdogCompanion } from './entities/companions/CapdogCompanion.js?v=20260912';
import { TransistorNPC } from './entities/npcs/TransistorNPC.js?v=20260912';
import { PlayerController } from './entities/player.js?v=20260914';

import { initDialogueUI, isDialogueOpen } from './ui/dialogue.js?v=20260821';
import { initCraftingUI, isCraftingMenuOpen, openCraftingMenu } from './ui/crafting.js?v=20260912';
import { initInventoryUI, isInventoryOpen } from './ui/inventoryUI.js?v=20260912';
import { initTradeUI } from './ui/trade.js?v=20260821';
import { initCrateUI, openCrateMenu } from './ui/crateUI.js?v=20260912';
import { updateHUD, setSpeedLines, showBanner, initHudPerf, applyPerfSnapshot, getSmoothedFps, setEnemyTargetMeshes } from './ui/hud.js?v=20260912';
import { combatFeedback } from './ui/combatFeedback.js?v=20260821';
import { renderCompass } from './ui/compass.js?v=20260821';
import { updateParticles } from './utils/particles.js?v=20260821';
import { isSimPaused } from './utils/simPause.js?v=20260825';
import { CONFIG } from './config/constants.js?v=20260821';
import { LoadingScreen } from './ui/LoadingScreen.js?v=20260821';
import { saveGame, loadGame, restoreFromSave } from './core/saveSystem.js?v=20260914';
import { setDifficulty } from './config/combatBalance.js?v=20260821';
import { initDifficultyUI } from './ui/difficultyUI.js?v=20260821';
import { initWorldSelectUI } from './ui/worldSelectUI.js?v=20260914';
import { SurvivalService } from './core/SurvivalService.js?v=20260910';
import { buildingService } from './building/BuildingService.js?v=20260914';
import { eventBus } from './core/EventBus.js?v=20260821';
import { EVENTS } from './core/events.js?v=20260912';

const _compassEuler = new THREE.Euler(0, 0, 0, 'YXZ');

class Game {
  constructor() {
    this.survival = new SurvivalService({
      energyDrainRate: CONFIG.SURVIVAL.ENERGY_DRAIN_RATE,
      integrityDrainRate: CONFIG.SURVIVAL.INTEGRITY_DRAIN_RATE,
      emitBanner: (text, icon) => eventBus.emit(EVENTS.UI_BANNER, { text, icon }),
      onGameOver: () => this.presentGameOver()
    });
    this.lastAlarmTime = 0;
    this.saveTimer = 0;
    this.nightPatrolSpider = null;
    this.nightPatrolSpawned = false;

    this.clock = new THREE.Clock();
    this.init();
  }

  get context() {
    const self = this;
    return {
      get isGameOver() { return self.survival.isGameOver; },
      get dataEnergy() { return self.survival.dataEnergy; },
      get circuitIntegrity() { return self.survival.circuitIntegrity; },
      setDataEnergy: (val) => { self.survival.setDataEnergy(val); },
      restoreEnergy: (amount) => { self.survival.restoreEnergy(amount); },
      consumeEnergy: (amount) => self.survival.consumeEnergy(amount),
      takeDamage: (amount) => { self.survival.takeDamage(amount); },
      restoreIntegrity: (amount) => { self.survival.restoreIntegrity(amount); },
      activateOverclock: (duration) => {
        self.survival.activateOverclock(duration);
        setSpeedLines(true);
      },
      respawn: () => {
        self.respawn();
      }
    };
  }

  presentGameOver() {
    audioService.gameOver();

    if (this.player) {
      if (typeof this.player.die === 'function') {
        this.player.die();
      } else if (this.player.controls) {
        this.player.controls.unlock();
      }
    }

    // Atualizar estatísticas na tela de Game Over
    const goCopper = document.getElementById('go-copper-count');
    const goCrystal = document.getElementById('go-crystal-count');
    const goCore = document.getElementById('go-core-count');
    if (goCopper) goCopper.textContent = inventory.getResource('copperWires') || 0;
    if (goCrystal) goCrystal.textContent = inventory.getResource('clockCrystals') || 0;
    if (goCore) goCore.textContent = getCollectedCount() || 0;

    const gameOverOverlay = document.getElementById('game-over-overlay');
    if (gameOverOverlay) {
      gameOverOverlay.classList.add('visible');
      gameOverOverlay.style.display = 'flex';
      gameOverOverlay.style.opacity = '1';
      gameOverOverlay.style.pointerEvents = 'auto';
    }

    const startOverlay = document.getElementById('start-overlay');
    if (startOverlay) {
      startOverlay.style.display = 'none';
    }
  }

  respawn() {
    this.survival.resetForRespawn();

    const startEyeHeight = CONFIG.PLAYER.EYE_HEIGHT || CONFIG.PLAYER.HEIGHT || 1.8;
    const spawn = resolvePlayerSpawn(
      CONFIG.PLAYER.INITIAL_POSITION.x,
      CONFIG.PLAYER.INITIAL_POSITION.z
    );
    camera.position.set(spawn.x, spawn.y + startEyeHeight, spawn.z);
    camera.rotation.set(0, 0, 0);

    if (this.player) {
      if (typeof this.player.respawn === 'function') {
        this.player.respawn();
      }
      if (this.player.controls) {
        this.player.controls.lock();
      }
    }

    const gameOverOverlay = document.getElementById('game-over-overlay');
    if (gameOverOverlay) {
      gameOverOverlay.classList.remove('visible');
      gameOverOverlay.style.display = 'none';
      gameOverOverlay.style.pointerEvents = 'none';
    }

    audioService.powerUp();
    showBanner('🛡️ System reboot! Integrity and energy restored to 100%!', '⚡');
  }

  async init() {
    LoadingScreen.updateProgress(15, 'Syncing lighting and buses...');
    applyPixelRatio(renderer);
    ensurePerfCounters(renderer);
    initAdaptiveQuality();
    initHudPerf();
    setupLighting();
    await new Promise(r => setTimeout(r, 60));

    await WorldBootstrap.build(this.context, {
      onProgress: (pct, msg) => LoadingScreen.updateProgress(pct, msg)
    });

    LoadingScreen.updateProgress(92, 'Loading arsenal, inventory, and sentinels...');
    inventory.init();
    initDialogueUI();

    const save = loadGame();
    if (save?.difficulty) setDifficulty(save.difficulty);

    TransistorNPC.spawnAll(this.context);
    SpiderBotEntity.spawnAll();
    SentinelEntity.spawnAll();
    CapdogCompanion.spawn(2.5, 28.5);

    this.player = new PlayerController(document.body, this.context);
    initCraftingUI(this.player);
    initInventoryUI(this.player);
    initTradeUI(this.player);
    initCrateUI(this.player);
    buildingService.setGameContext(this.context);
    buildingService.bindUi({ openCraftingMenu, openCrateMenu });

    if (save) {
      const restored = restoreFromSave(save);
      this.survival.applySavedStats(restored);
      showBanner('💾 Progress restored!', '💾');
    }
    initDifficultyUI();
    initWorldSelectUI({
      getSurvivalStats: () => ({
        dataEnergy: this.survival.dataEnergy,
        circuitIntegrity: this.survival.circuitIntegrity
      })
    });

    const btnRespawn = document.getElementById('btn-respawn');
    if (btnRespawn) {
      btnRespawn.onclick = (e) => {
        e.stopPropagation();
        this.respawn();
      };
    }

    window.addEventListener('keydown', (e) => {
      if (this.survival.isGameOver && (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyR')) {
        this.respawn();
      }
    });

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      applyPixelRatio(renderer);
    });

    window.addEventListener('beforeunload', () => {
      saveGame({ dataEnergy: this.survival.dataEnergy, circuitIntegrity: this.survival.circuitIntegrity });
    });

    this.animate = this.animate.bind(this);
    this.animate();

    await new Promise(r => setTimeout(r, 80));
    LoadingScreen.finish();
  }

  animate() {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.08);
    const time = this.clock.getElapsedTime();

    // Game Over ou Pausa: renderiza sem rodar simulações de sobrevivência ou movimentos
    if (this.survival.isGameOver) {
      renderer.render(scene, camera);
      return;
    }

    const startOverlay = document.getElementById('start-overlay');
    if (isSimPaused({
      isGameOver: this.survival.isGameOver,
      overlayDisplay: startOverlay ? startOverlay.style.display : 'none',
      overlayOpacity: startOverlay ? startOverlay.style.opacity : '0'
    })) {
      renderer.render(scene, camera);
      return;
    }

    tickWorldClock(delta, { paused: false, cycleSeconds: CONFIG.WORLD.DAY_CYCLE_SECONDS });
    tickStormMachine(delta, worldClock);

    // 1. Overclock
    if (this.survival.tickOverclock(delta)) {
      setSpeedLines(false);
      showBanner('Overclock ended. Normal frequency restored.', 'ℹ️');
    }

    // 2. Entidades e Companheiro
    entityRegistry.updateAll(delta, time, this.player);

    // 3. Jogador e Armas
    if (this.player) {
      this.player.update(delta, time, this.survival.isOverclockActive);
    }
    weaponSystem.update(delta, this.context);
    updateParticles(delta);

    // Projéteis e Armadilhas de Inimigos
    SpiderBotEntity.updateTrapsAndProjectiles(delta, this.player);
    SentinelEntity.updateProjectiles(delta, this.player);

    // 4. Mundo e Atmosfera (com Smart Culling de Renderização)
    WorldBootstrap.tick(delta, time, camera.position, camera);
    updateAtmosphericLighting(delta, time, camera.position, worldClock.timeOfDay);
    updateShadowFollow(camera.position);

    const bolt = tickLightningBolt(delta, worldClock.storm);
    if (bolt) {
      const sx = camera.position.x + bolt.ox;
      const sz = camera.position.z + bolt.oz;
      triggerLightningFlash(sx, camera.position.y + 14, sz);
      audioService.play('playExplosion');
      if (this.player && strikeHitsPlayer(camera.position.x, camera.position.z, sx, sz)) {
        this.survival.takeDamage(STORM_STRIKE_DAMAGE);
        const dx = camera.position.x - sx;
        const dz = camera.position.z - sz;
        const len = Math.hypot(dx, dz) || 1;
        this.player.applyKnockback((dx / len) * STORM_KNOCKBACK, (dz / len) * STORM_KNOCKBACK);
      }
    }

    this.tickNightPatrol();

    // 5. Sobrevivência
    this.survival.tick(delta);

    if (this.survival.dataEnergy < 20 && this.player.controls.isLocked) {
      if (time - this.lastAlarmTime > 2.5) {
        audioService.lowEnergyAlarm();
        this.lastAlarmTime = time;
      }
    }

    // 6. HUD e Bússola
    updateHUD(this.survival.dataEnergy, this.survival.circuitIntegrity, this.survival.isOverclockActive, delta);
    combatFeedback.update(delta);

    this.saveTimer += delta;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      saveGame({ dataEnergy: this.survival.dataEnergy, circuitIntegrity: this.survival.circuitIntegrity });
    }

    _compassEuler.setFromQuaternion(camera.quaternion);
    renderCompass(_compassEuler.y);

    // 7. Render + métricas de perf (?perf=1)
    renderer.render(scene, camera);
    const perfSnap = tickPerfStats(delta, renderer);
    if (perfSnap) applyPerfSnapshot(perfSnap);
    tickAdaptiveQuality(delta, getSmoothedFps());
  }

  tickNightPatrol() {
    const night = isNight(worldClock.timeOfDay);
    if (!night) this.nightPatrolSpawned = false;
    if (this.nightPatrolSpider && this.nightPatrolSpider.isDead) {
      this.nightPatrolSpider = null;
    }

    if (shouldSpawnNightPatrol({
      isNightNow: night,
      hasExtra: !!(this.nightPatrolSpider || this.nightPatrolSpawned)
    })) {
      const a = pickNightPatrolAnchor();
      const p = resolveEntitySpawn(a.x, a.z, 0.7);
      this.nightPatrolSpider = new SpiderBotEntity(p.x, p.z);
      this.nightPatrolSpawned = true;
      setEnemyTargetMeshes(spiderBots.map((b) => b.bodyMesh).filter(Boolean));
    }

    if (this.nightPatrolSpider && shouldDespawnNightPatrol({
      isNightNow: night,
      inCombat: isNightCombat(this.nightPatrolSpider)
    })) {
      this.nightPatrolSpider.despawnSilent();
      this.nightPatrolSpider = null;
    }
  }
}

window.game = new Game();
