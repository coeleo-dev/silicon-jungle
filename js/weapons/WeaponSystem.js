/**
 * WeaponSystem — Orquestrador do Sistema de Armas com Strategy Pattern
 * Gerencia a montagem visual no braço do jogador, troca de slots, cooldowns e disparo.
 */
import { scene, camera } from '../core/scene.js?v=20260821';
import { CONFIG } from '../config/constants.js?v=20260821';
import { WeaponModelFactory } from './WeaponModelFactory.js?v=20260825';
import { KnifeStrategy } from './strategies/KnifeStrategy.js?v=20260821';
import { ProjectileStrategy } from './strategies/ProjectileStrategy.js?v=20260824';
import { ShotgunStrategy } from './strategies/ShotgunStrategy.js?v=20260824';
import { FlashlightStrategy } from './strategies/FlashlightStrategy.js?v=20260821';
import { combatSystem } from '../combat/CombatSystem.js?v=20260821';
import { showBanner } from '../ui/hud.js?v=20260912';

export class WeaponSystem {
  constructor() {
    this.weaponRig = new THREE.Group();
    this.models = new Map();
    this.strategies = new Map();

    this.flashlightSpotLight = null;
    this.flashlightTarget = null;
    this.flashlightOn = false;

    this.lastAttackTimes = new Map();
    this.isAttacking = false;
    this.attackTimer = 0;

    this.init();
  }

  init() {
    // 1. Instanciar Modelos 3D
    const knifeModel = WeaponModelFactory.createKnifeModel();
    const flashlightModel = WeaponModelFactory.createFlashlightModel();
    const pistolModel = WeaponModelFactory.createPistolModel();
    const shotgunModel = WeaponModelFactory.createShotgunModel();
    const rifleModel = WeaponModelFactory.createRifleModel();

    this.models.set(CONFIG.WEAPONS.KNIFE.ID, knifeModel);
    this.models.set(CONFIG.WEAPONS.FLASHLIGHT.ID, flashlightModel);
    this.models.set(CONFIG.WEAPONS.PLASMA_PISTOL.ID, pistolModel);
    this.models.set(CONFIG.WEAPONS.ARC_SHOTGUN.ID, shotgunModel);
    this.models.set(CONFIG.WEAPONS.BUS_RIFLE.ID, rifleModel);

    this.weaponRig.add(knifeModel, flashlightModel, pistolModel, shotgunModel, rifleModel);

    // 2. SpotLight da Lanterna
    this.flashlightSpotLight = new THREE.SpotLight(
      CONFIG.WEAPONS.FLASHLIGHT.COLOR,
      CONFIG.WEAPONS.FLASHLIGHT.INTENSITY,
      CONFIG.WEAPONS.FLASHLIGHT.RANGE,
      CONFIG.WEAPONS.FLASHLIGHT.ANGLE,
      CONFIG.WEAPONS.FLASHLIGHT.PENUMBRA
    );
    this.flashlightSpotLight.castShadow = false;
    this.flashlightSpotLight.visible = false;

    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, 0, -20);
    camera.add(this.flashlightTarget);
    this.flashlightSpotLight.target = this.flashlightTarget;
    camera.add(this.flashlightSpotLight);

    camera.add(this.weaponRig);
    scene.add(camera);

    // 3. Registrar Estratégias de Ação por Arma
    this.strategies.set(CONFIG.WEAPONS.KNIFE.ID, new KnifeStrategy(CONFIG.WEAPONS.KNIFE));
    this.strategies.set(CONFIG.WEAPONS.FLASHLIGHT.ID, new FlashlightStrategy(this));
    this.strategies.set(CONFIG.WEAPONS.PLASMA_PISTOL.ID, new ProjectileStrategy(CONFIG.WEAPONS.PLASMA_PISTOL, 'shootLaser'));
    this.strategies.set(CONFIG.WEAPONS.ARC_SHOTGUN.ID, new ShotgunStrategy(CONFIG.WEAPONS.ARC_SHOTGUN));
    this.strategies.set(CONFIG.WEAPONS.BUS_RIFLE.ID, new ProjectileStrategy(CONFIG.WEAPONS.BUS_RIFLE, 'busRifle'));

    this.switchWeaponModel(CONFIG.WEAPONS.PLASMA_PISTOL.ID);
  }

  /**
   * Alterna a visibilidade do modelo 3D correspondente
   */
  switchWeaponModel(weaponId) {
    for (const [id, model] of this.models.entries()) {
      model.visible = (id === weaponId);
    }
  }

  /**
   * Liga ou desliga a lanterna tática
   */
  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    if (this.flashlightSpotLight) {
      this.flashlightSpotLight.visible = this.flashlightOn;
    }
    return this.flashlightOn;
  }

  isFlashlightOn() {
    return this.flashlightOn;
  }

  /**
   * Executa a ação da arma ativa respeitando cooldown e animação de recuo
   */
  useActiveWeapon(weaponId, gameContext = null) {
    const strategy = this.strategies.get(weaponId);
    if (!strategy) return;

    const now = performance.now() / 1000;
    const cooldown = strategy.cooldown || 0.2;

    const lastUsed = this.lastAttackTimes.get(weaponId) || 0;
    if (now - lastUsed < cooldown) return;

    const energyCost = strategy.energyCost || 0;
    if (energyCost > 0) {
      if (gameContext && typeof gameContext.consumeEnergy === 'function') {
        if (!gameContext.consumeEnergy(energyCost)) {
          showBanner('⚠️ Not enough energy to fire!', '🔋');
          return;
        }
      }
    }

    this.lastAttackTimes.set(weaponId, now);

    if (strategy.attackTimerDuration > 0) {
      this.isAttacking = true;
      this.attackTimer = strategy.attackTimerDuration;
    }

    strategy.execute(gameContext);

    const kick = strategy.cameraKick || 0;
    if (kick) {
      camera.rotation.x -= kick;
    }
  }

  /**
   * Atualização de recuo e disparo a cada frame
   */
  update(delta, gameContext = null) {
    if (this.isAttacking) {
      this.attackTimer -= delta;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.weaponRig.position.z = 0;
      } else {
        this.weaponRig.position.z = Math.sin(this.attackTimer * 20) * 0.08;
      }
    }

    combatSystem.update(delta, { gameContext });
  }

  get activeProjectiles() {
    return combatSystem.activeProjectiles;
  }
}

export const weaponSystem = new WeaponSystem();
