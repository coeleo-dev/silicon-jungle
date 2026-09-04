/**
 * ProjectileStrategy — Estratégia de Disparo Linear de Projétil / Feixe
 */
import { camera } from '../../core/scene.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { combatSystem } from '../../combat/CombatSystem.js?v=20260821';
import { getProjectileGeometry, getProjectileMaterial, acquireProjectileMesh } from '../../combat/ProjectilePool.js?v=20260821';

export class ProjectileStrategy {
  constructor(config, soundFnName = 'shootLaser') {
    this.config = config || {};
    this.soundFnName = soundFnName;
  }

  get cooldown() {
    return this.config.COOLDOWN || 0.22;
  }

  get attackTimerDuration() {
    return 0.18;
  }

  get energyCost() {
    return this.config.ENERGY_COST || 0;
  }

  get cameraKick() {
    return this.config.CAMERA_KICK || 0;
  }

  execute(gameContext = null) {
    if (this.soundFnName === 'busRifle') {
      audioService.busRifle();
    } else {
      audioService.shootLaser();
    }

    const muzzlePos = new THREE.Vector3();
    camera.getWorldPosition(muzzlePos);
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    muzzlePos.addScaledVector(forward, 0.8).add(new THREE.Vector3(0.18, -0.12, 0));

    const bursts = this.config.BURST_COUNT || 1;
    const color = this.config.PROJECTILE_COLOR || this.config.COLOR || 0x00f0ff;
    const speed = this.config.PROJECTILE_SPEED || this.config.SPEED || 85;
    const damage = this.config.DAMAGE || 25;
    const maxDistance = this.config.MAX_DIST || this.config.RANGE || 120;
    const hitRadius = this.config.HIT_RADIUS || 2.0;
    const splashRadius = this.config.SPLASH_RADIUS || 0;

    for (let b = 0; b < bursts; b++) {
      const dir = forward.clone();
      if (bursts > 1) {
        dir.x += (b - (bursts - 1) / 2) * 0.012;
        dir.normalize();
      }
      const origin = muzzlePos.clone().addScaledVector(dir, b * 0.15);
      const pGeo = getProjectileGeometry('plasma');
      const pMat = getProjectileMaterial(color);
      const pMesh = acquireProjectileMesh(pGeo, pMat);
      pMesh.position.copy(origin);
      pMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

      combatSystem.fireProjectile({
        mesh: pMesh,
        direction: dir,
        speed,
        damage,
        maxDistance,
        hitRadius,
        splashRadius
      });
    }
  }
}
