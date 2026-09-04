/**
 * ShotgunStrategy — Estratégia de Disparo com Dispersão Múltipla (Espingarda de Arco)
 */
import { camera } from '../../core/scene.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { combatSystem } from '../../combat/CombatSystem.js?v=20260821';
import { CONFIG } from '../../config/constants.js?v=20260821';
import { getProjectileGeometry, getProjectileMaterial, acquireProjectileMesh } from '../../combat/ProjectilePool.js?v=20260821';

export class ShotgunStrategy {
  constructor(config = CONFIG.WEAPONS.ARC_SHOTGUN) {
    this.config = config || {};
  }

  get cooldown() {
    return this.config.COOLDOWN || 0.75;
  }

  get attackTimerDuration() {
    return 0.35;
  }

  get energyCost() {
    return this.config.ENERGY_COST || 0;
  }

  execute(gameContext = null) {
    audioService.arcShotgun();

    const numPellets = this.config.PELLETS || 6;
    const spread = this.config.SPREAD || 0.08;

    for (let i = 0; i < numPellets; i++) {
      const muzzlePos = new THREE.Vector3();
      camera.getWorldPosition(muzzlePos);
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);

      forward.x += (Math.random() - 0.5) * spread;
      forward.y += (Math.random() - 0.5) * spread;
      forward.z += (Math.random() - 0.5) * spread;
      forward.normalize();

      const pGeo = getProjectileGeometry('pellet');
      const color = this.config.PROJECTILE_COLOR || this.config.COLOR || 0xfbbf24;
      const pMat = getProjectileMaterial(color);
      const pMesh = acquireProjectileMesh(pGeo, pMat);
      pMesh.position.copy(muzzlePos);

      combatSystem.fireProjectile({
        mesh: pMesh,
        direction: forward,
        speed: this.config.PROJECTILE_SPEED || this.config.SPEED || 70,
        damage: this.config.DAMAGE || this.config.DAMAGE_PER_PELLET || 18,
        maxDistance: this.config.MAX_DIST || this.config.RANGE || 60,
        hitRadius: this.config.HIT_RADIUS || 1.55
      });
    }
  }
}
