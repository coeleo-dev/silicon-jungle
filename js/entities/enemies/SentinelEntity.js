/**
 * SentinelEntity — Inimigo Robô Sentinela Bípede com Articulação Realista no Solo
 * Modelo PBR com pés plantados em Y=0 e animação de marcha bípede conectada ao quadril.
 */
import { EnemyEntity } from '../base/EnemyEntity.js?v=20260830';
import { scene, createCelMaterial, camera } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { createSparkBurst } from '../../utils/particles.js?v=20260821';
import { showHitmarker, showBanner, addEnemyTargetMeshes } from '../../ui/hud.js?v=20260912';
import { spawnPowerCore } from '../../world/collectibles.js?v=20260912';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { eventBus } from '../../core/EventBus.js?v=20260821';
import { distToSegmentSquared } from '../../utils/math.js?v=20260821';
import { applyToonOutlinesToMeshes } from '../../core/outline.js?v=20260826';
import { acquireProjectileMesh, releaseProjectileMesh } from '../../combat/ProjectilePool.js?v=20260821';
import { resolveCombatState, enemyProjectileOutcome } from '../../combat/losPolicy.js?v=20260821';
import { pickBurstPattern, strafeOffset } from '../../combat/sentinelCombat.js?v=20260821';
import { enemyHp, enemyDamage } from '../../config/combatBalance.js?v=20260821';
import { resolveEntitySpawn } from '../../world/spawnResolver.js?v=20260821';

export const phenomMinions = [];
export const phenomMinionMeshes = [];
export const minionProjectiles = [];

const projectileGeo = new THREE.SphereGeometry(0.18, 6, 6);
const projectileMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

const _mDir = new THREE.Vector3();
const _mPos = new THREE.Vector3();
const _eyePos = new THREE.Vector3();
const _muzzlePos = new THREE.Vector3();
const _sparkPos = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _minionForward = new THREE.Vector3();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _minionPrevPos = new THREE.Vector3();

function spawnMinionLaser(startPos, targetPos) {
  const mesh = acquireProjectileMesh(projectileGeo, projectileMat);
  mesh.position.copy(startPos);
  scene.add(mesh);

  const dir = targetPos.clone().sub(startPos).normalize();

  minionProjectiles.push({
    mesh: mesh,
    dir: dir,
    speed: 26.0,
    lifetime: 3.0
  });

  audioService.minionShoot();
}

export class SentinelEntity extends EnemyEntity {
  constructor(x, z, patrolRadius = 10, isStaticGuard = false) {
    const spawn = resolveEntitySpawn(x, z, 0.9);
    const hp = enemyHp('sentinel');
    super({
      type: 'sentinel',
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      hp,
      maxHp: hp,
      speed: 5.5,
      patrolRadius: patrolRadius,
      aggroRange: 28,
      leashRange: 36,
      lootTable: [
        { resource: 'copperWires', amount: 3 },
        { resource: 'thermalPastes', amount: 1, chance: 0.3 },
        { resource: 'clockCrystals', amount: 1, chance: 0.2 }
      ]
    });

    this.isStaticGuard = isStaticGuard;
    this.groundOffset = 0.25;
    this.hitCenterY = 1.4;
    this.canSeePlayer = false;
    this.losTimer = Math.random() * 0.15;
    this.burstCooldown = 2.2 + Math.random() * 1.5;
    this.burstCountRemaining = 0;
    this.burstTimer = 0;
    this.hitTimer = 0;
    this.burstWindup = 0;
    this.burstInterval = 0.28;
    this.strafePhase = Math.random() * Math.PI * 2;
    this.isWindingUp = false;
    this.windupHalo = null;

    // Componentes de modelo
    this.upperBodyGroup = null;
    this.chest = null;
    this.head = null;
    this.visor = null;
    this.core = null;
    this.rightArmPivot = null;
    this.leftArmPivot = null;
    this.leftLegPivot = null;
    this.rightLegPivot = null;
    this.shield = null;

    // Pontos fracos (Fase 3): reator dorsal (core ×3, só por trás) e cabeça/visor (head ×2)
    this.weakPoints = [
      { name: 'core', yMin: 1.55, yMax: 2.15, mult: 3, behind: true },
      { name: 'head', yMin: 2.2, yMax: Infinity, mult: 2 }
    ];

    this.buildModel();
    applyToonOutlinesToMeshes([this.chest, this.head], 0.04);

    phenomMinions.push(this);
    phenomMinionMeshes.push(this.chest, this.head, this.shield, this.core);
    addEnemyTargetMeshes([this.chest, this.head, this.shield, this.core]);
  }

  buildModel() {
    const chassisMat = TOON_MATERIALS.METAL_BRUSHED_STEEL;
    const armorMat = TOON_MATERIALS.PAINTED_METAL;
    const shieldMat = TOON_MATERIALS.METAL_PLATES_IO;
    const copperMat = createCelMaterial(0xd97706);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    this.visorMat = visorMat;

    // Tronco Superior (Oscila verticalmente durante a marcha)
    this.upperBodyGroup = new THREE.Group();
    this.upperBodyGroup.position.y = 1.25; // Base do quadril
    this.group.add(this.upperBodyGroup);

    // 1. Tronco / Peito
    const chestGeo = new THREE.BoxGeometry(0.95, 1.15, 0.7);
    this.chest = new THREE.Mesh(chestGeo, chassisMat);
    this.chest.position.y = 0.55;
    this.chest.castShadow = true;
    this.upperBodyGroup.add(this.chest);

    // Reator de Diodo Dorsal (ponto fraco visível)
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), coreMat);
    this.core.position.set(0, 0.58, -0.42);
    this.upperBodyGroup.add(this.core);
    this.core.userData = { isMinion: true, minionRef: this };

    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.035, 8, 16),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9 })
    );
    coreRing.position.copy(this.core.position);
    coreRing.rotation.x = Math.PI / 2;
    this.upperBodyGroup.add(coreRing);

    // Ombros cilíndricos
    const shoulderGeo = new THREE.SphereGeometry(0.22, 8, 6);
    const lShoulder = new THREE.Mesh(shoulderGeo, armorMat);
    lShoulder.position.set(-0.52, 0.95, 0);
    this.upperBodyGroup.add(lShoulder);
    const rShoulder = new THREE.Mesh(shoulderGeo, armorMat);
    rShoulder.position.set(0.52, 0.95, 0);
    this.upperBodyGroup.add(rShoulder);

    // 2. Cabeça Angular com Visor Laser Tático
    const headGeo = new THREE.BoxGeometry(0.58, 0.42, 0.62);
    this.head = new THREE.Mesh(headGeo, armorMat);
    this.head.position.set(0, 1.35, 0);
    this.head.castShadow = true;
    this.upperBodyGroup.add(this.head);

    const visorGeo = new THREE.BoxGeometry(0.62, 0.16, 0.1);
    this.visor = new THREE.Mesh(visorGeo, visorMat);
    this.visor.position.set(0, 1.38, 0.34);
    this.upperBodyGroup.add(this.visor);

    const haloGeo = new THREE.RingGeometry(0.18, 0.42, 16);
    this.windupHalo = new THREE.Mesh(haloGeo, new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false
    }));
    this.windupHalo.position.set(0, 1.38, 0.42);
    this.windupHalo.visible = false;
    this.upperBodyGroup.add(this.windupHalo);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.55, 6), copperMat);
    antenna.position.set(0.14, 1.72, -0.04);
    this.upperBodyGroup.add(antenna);
    const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), visorMat);
    antennaTip.position.set(0.14, 2.02, -0.04);
    this.upperBodyGroup.add(antennaTip);

    // 3. Braço Direito com Rifle de Plasma Pesado
    this.rightArmPivot = new THREE.Group();
    this.rightArmPivot.position.set(0.7, 0.85, 0);

    const armGeo = new THREE.BoxGeometry(0.22, 0.7, 0.22);
    const rArm = new THREE.Mesh(armGeo, armorMat);
    rArm.position.set(0, -0.3, 0);
    this.rightArmPivot.add(rArm);

    const rifleGeo = new THREE.BoxGeometry(0.22, 0.3, 1.3);
    const rifle = new THREE.Mesh(rifleGeo, chassisMat);
    rifle.position.set(0, -0.6, 0.45);
    this.rightArmPivot.add(rifle);

    for (let b = -1; b <= 1; b++) {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), copperMat);
      barrel.position.set(b * 0.06, -0.6, 1.15);
      barrel.rotation.x = Math.PI / 2;
      this.rightArmPivot.add(barrel);
    }
    this.upperBodyGroup.add(this.rightArmPivot);

    // 4. Braço Esquerdo com Escudo Curvo
    this.leftArmPivot = new THREE.Group();
    this.leftArmPivot.position.set(-0.7, 0.85, 0);

    const lArm = new THREE.Mesh(armGeo, armorMat);
    lArm.position.set(0, -0.3, 0);
    this.leftArmPivot.add(lArm);

    const shieldGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.12, 8, 1, false, 0, Math.PI * 1.2);
    this.shield = new THREE.Mesh(shieldGeo, shieldMat);
    this.shield.position.set(-0.15, -0.35, 0.5);
    this.shield.rotation.x = Math.PI / 2;
    this.shield.rotation.z = Math.PI / 4;
    this.leftArmPivot.add(this.shield);
    this.upperBodyGroup.add(this.leftArmPivot);

    // 5. Pernas Bípedes Articuladas no Quadril (Pivôs em Y=1.25 com pés cravados em Y=0)
    const thighGeo = new THREE.BoxGeometry(0.28, 0.65, 0.32);
    const shinGeo = new THREE.BoxGeometry(0.24, 0.65, 0.28);
    const footGeo = new THREE.BoxGeometry(0.32, 0.12, 0.48);

    // Perna Esquerda
    this.leftLegPivot = new THREE.Group();
    this.leftLegPivot.position.set(-0.32, 1.25, 0);

    const lThigh = new THREE.Mesh(thighGeo, armorMat);
    lThigh.position.set(0, -0.32, 0);
    lThigh.castShadow = false;
    this.leftLegPivot.add(lThigh);

    const lShin = new THREE.Mesh(shinGeo, chassisMat);
    lShin.position.set(0, -0.85, 0);
    lShin.castShadow = false;
    this.leftLegPivot.add(lShin);

    const lFoot = new THREE.Mesh(footGeo, armorMat);
    lFoot.position.set(0, -1.18, 0.08);
    lFoot.castShadow = false;
    this.leftLegPivot.add(lFoot);

    this.group.add(this.leftLegPivot);

    // Perna Direita
    this.rightLegPivot = new THREE.Group();
    this.rightLegPivot.position.set(0.32, 1.25, 0);

    const rThigh = new THREE.Mesh(thighGeo, armorMat);
    rThigh.position.set(0, -0.32, 0);
    rThigh.castShadow = false;
    this.rightLegPivot.add(rThigh);

    const rShin = new THREE.Mesh(shinGeo, chassisMat);
    rShin.position.set(0, -0.85, 0);
    rShin.castShadow = false;
    this.rightLegPivot.add(rShin);

    const rFoot = new THREE.Mesh(footGeo, armorMat);
    rFoot.position.set(0, -1.18, 0.08);
    rFoot.castShadow = false;
    this.rightLegPivot.add(rFoot);

    this.group.add(this.rightLegPivot);

    this.chest.userData = { isMinion: true, minionRef: this };
    this.head.userData = { isMinion: true, minionRef: this };
    this.shield.userData = { isMinion: true, minionRef: this, isShield: true };
    this.core.userData = { isMinion: true, minionRef: this };
  }

  updateAI(delta, time, playerPos, ctx) {
    // Respeitar a máquina de estados: se atordoado, não agir (stun do Capdog funciona)
    if (this.currentState && this.currentState.name === 'STUNNED') {
      this.stunTimer -= delta;
      if (this.stunTimer <= 0) {
        this.setState('PATROL');
      }
      return;
    }

    const distToPlayer = this.distanceTo(playerPos);

    this.losTimer -= delta;
    if (this.losTimer <= 0) {
      this.losTimer = 0.25;
      if (distToPlayer < 32) {
        _eyePos.copy(this.group.position);
        _eyePos.y += 2.6;
        this.canSeePlayer = worldService.hasLineOfSight(_eyePos, playerPos);
      } else {
        this.canSeePlayer = false;
      }
    }

    const nextState = resolveCombatState({
      canSeePlayer: this.canSeePlayer,
      dist: distToPlayer,
      aggroRange: this.aggroRange,
      leashRange: this.leashRange,
      current: this.state
    });
    if (this.state === 'COMBAT' && nextState !== 'COMBAT') {
      this.burstCountRemaining = 0;
      this.burstWindup = 0;
      this.isWindingUp = false;
      if (this.visor) this.visor.scale.set(1, 1, 1);
      if (this.windupHalo) {
        this.windupHalo.visible = false;
        this.windupHalo.material.opacity = 0;
      }
    }
    this.state = nextState;

    if (this.state === 'COMBAT') {
      _mDir.copy(playerPos).sub(this.group.position).setY(0);
      _mDir.normalize();

      this.group.rotation.y = Math.atan2(_mDir.x, _mDir.z);

      this.leftArmPivot.rotation.x = -Math.PI / 4;
      this.rightArmPivot.rotation.x = -Math.PI / 3;

      _mPos.copy(this.group.position);
      if (distToPlayer > 12 && !this.isStaticGuard) {
        _mPos.addScaledVector(_mDir, this.speed * delta);
      }
      const strafe = strafeOffset(time + this.strafePhase, distToPlayer);
      if (strafe !== 0) {
        _mPos.x += -_mDir.z * strafe * delta;
        _mPos.z += _mDir.x * strafe * delta;
      }
      if ((distToPlayer > 12 && !this.isStaticGuard) || strafe !== 0) {
        if (!worldService.checkEntityCollision(_mPos, 0.9)) {
          this.group.position.copy(_mPos);
        }
        this.walkTime += delta * 8;
      }

      this.burstCooldown -= delta;
      if (this.burstCooldown <= 0 && this.burstCountRemaining === 0 && this.burstWindup <= 0 && this.canSeePlayer) {
        const pattern = pickBurstPattern();
        this.burstCountRemaining = pattern.shots;
        this.burstTimer = 0;
        this.burstCooldown = 3.5 + Math.random() * 2.0;
        this.burstWindup = pattern.windup;
        this.burstInterval = pattern.interval;
        this.activePattern = pattern.name;
      }

      if (this.burstWindup > 0) {
        this.isWindingUp = true;
        this.burstWindup -= delta;
        if (this.visorMat) this.visorMat.color.setHex(0xffffff);
        if (this.visor) this.visor.scale.set(1.85, 2.4, 1.2);
        if (this.windupHalo) {
          this.windupHalo.visible = true;
          this.windupHalo.material.opacity = 0.75 + Math.sin(time * 22) * 0.2;
        }
        if (this.core) this.core.scale.setScalar(1.55 + Math.sin(time * 14) * 0.2);
        if (this.rightArmPivot) {
          this.rightArmPivot.rotation.x = -Math.PI / 3 + Math.sin(time * 40) * 0.12;
        }
        if (this.burstWindup <= 0) {
          this.isWindingUp = false;
          if (this.visorMat) this.visorMat.color.setHex(0xff0055);
          if (this.visor) this.visor.scale.set(1, 1, 1);
          if (this.windupHalo) {
            this.windupHalo.visible = false;
            this.windupHalo.material.opacity = 0;
          }
          this.burstTimer = 0;
        }
      }

      if (this.burstCountRemaining > 0 && this.burstWindup <= 0) {
        this.burstTimer -= delta;
        if (this.burstTimer <= 0) {
          this.rightArmPivot.getWorldPosition(_muzzlePos);
          _muzzlePos.y -= 0.3;
          _muzzlePos.z += 0.8;

          if (!worldService.hasLineOfSight(_muzzlePos, playerPos)) {
            this.burstCountRemaining = 0;
            this.burstWindup = 0;
            this.canSeePlayer = false;
            this.state = 'PATROL';
          } else {
            spawnMinionLaser(_muzzlePos, playerPos);
            createSparkBurst(_muzzlePos, 0xf97316, 8);

            this.burstCountRemaining--;
            if (this.burstCountRemaining <= 0 && this.visorMat) {
              this.visorMat.color.setHex(0xff0055);
            }
            this.burstTimer = this.burstInterval || 0.28;
          }
        }
      }
    } else {
      // PATROL
      super.patrol(delta);
      this.leftArmPivot.rotation.x = Math.sin(this.walkTime) * 0.15;
      this.rightArmPivot.rotation.x = -Math.sin(this.walkTime) * 0.15;
    }
  }

  setLimbsVisible(visible) {
    if (this.leftLegPivot) this.leftLegPivot.visible = visible;
    if (this.rightLegPivot) this.rightLegPivot.visible = visible;
    if (this.leftArmPivot) this.leftArmPivot.visible = visible;
    if (this.rightArmPivot) this.rightArmPivot.visible = visible;
  }

  updateAnimation(delta, time) {
    if (this.hitTimer > 0) {
      this.hitTimer -= delta;
      if (this.hitTimer <= 0 && this.chest) {
        this.chest.material.color.setHex(0xffffff);
      }
    }

    if (this.core && !this.isWindingUp) {
      this.core.scale.setScalar(1.0 + Math.sin(time * 8) * 0.15);
    }

    if (this._updateLod >= 1) return;

    // Marcha bípede com rotação a partir da articulação do quadril
    if (this.leftLegPivot && this.rightLegPivot) {
      const stride = Math.sin(this.walkTime) * 0.48;
      this.leftLegPivot.rotation.x = stride;
      this.rightLegPivot.rotation.x = -stride;
    }

    // Oscilação vertical do tronco superior
    if (this.upperBodyGroup) {
      this.upperBodyGroup.position.y = 1.25 + Math.abs(Math.sin(this.walkTime * 2)) * 0.05;
    }
  }

  takeDamage(amount, hitPoint = null, hitObject = null, gameContext = null, playerCameraPos = null) {
    if (this.isDead) return;

    const camPos = playerCameraPos || (typeof camera !== 'undefined' ? camera.position : null);

    if (camPos) {
      _toPlayer.copy(camPos).sub(this.group.position).normalize();
      _minionForward.copy(_zAxis).applyEuler(this.group.rotation);
      const dot = _toPlayer.dot(_minionForward);

      // Escudo frontal absorve grande parte do dano de tiros frontais. Flanqueie pelas costas (dot baixo/negativo).
      if (dot > 0.75) {
        const reduced = Math.max(1, Math.round(amount * 0.3));
        this.hp -= reduced;
        audioService.shieldDeflect();
        createSparkBurst(hitPoint || this.group.position, 0xd97706, 25);
        showBanner('🛡️ Shield absorbed the shot! Flank from behind!', '⚠️');
        this.hitTimer = 0.15;
        if (this.chest) this.chest.material.color.setHex(0xffaa00);
        if (this.hp <= 0) this.die(gameContext);
        return;
      }
    }

    showHitmarker();

    if (hitPoint) {
      _sparkPos.copy(hitPoint);
    } else {
      _sparkPos.copy(this.group.position);
    }
    createSparkBurst(_sparkPos, 0xf97316, 20);

    this.hitTimer = 0.15;
    if (this.chest) this.chest.material.color.setHex(0xff3333);

    super.takeDamage(amount, hitPoint, hitObject, gameContext);
  }

  die(gameContext = null) {
    if (this.isDead) return;

    _sparkPos.copy(this.group.position);
    _sparkPos.y += 1.5;
    createSparkBurst(_sparkPos, 0x00ffaa, 40);

    spawnPowerCore(this.group.position.x, this.group.position.z, gameContext);
    showBanner('💥 Phenom Sentinel destroyed! (+3 copper wires and 1 cell)', '⚡');

    const idx = phenomMinions.indexOf(this);
    if (idx !== -1) phenomMinions.splice(idx, 1);

    super.die(gameContext);
  }

  static spawnAll() {
    const guardSpawns = [
      [35, 45], [-35, 45], [35, 75], [-35, 75],
      [65, -60], [75, -60], [60, -75], [80, -75],
      [-75, -70], [-85, -70], [-70, -85],
      [-65, 60], [65, 60], [-60, -50], [60, -50],
      [-85, 45], [85, 45], [45, 105], [-45, 105],
      [105, 55], [-105, 55], [105, -55], [-105, -55]
    ];

    guardSpawns.forEach(pos => {
      new SentinelEntity(pos[0], pos[1], 14);
    });
  }

  static updateProjectiles(delta, player) {
    const playerPos = player?.camera?.position || (typeof camera !== 'undefined' ? camera.position : null);
    if (!playerPos) return;

    for (let i = minionProjectiles.length - 1; i >= 0; i--) {
      const p = minionProjectiles[i];
      _minionPrevPos.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.dir, p.speed * delta);
      p.lifetime -= delta;

      if (p.lifetime <= 0) {
        releaseProjectileMesh(p.mesh);
        minionProjectiles.splice(i, 1);
        continue;
      }

      const playerHit = distToSegmentSquared(playerPos, _minionPrevPos, p.mesh.position) <= 1.4 * 1.4;
      const losToPlayer = playerHit && worldService.hasLineOfSight(_minionPrevPos, playerPos);
      const losAlongStep = losToPlayer || worldService.hasLineOfSight(_minionPrevPos, p.mesh.position);
      const outcome = enemyProjectileOutcome({ playerHit, losToPlayer, losAlongStep });

      if (outcome === 'hitPlayer') {
        eventBus.emit('combat:attacked', { source: p.mesh.position.clone() });
        if (player.takeDamage) {
          player.takeDamage(enemyDamage('sentinel', 'laser'));
        }
        createSparkBurst(p.mesh.position, 0xf97316, 25);
        releaseProjectileMesh(p.mesh);
        minionProjectiles.splice(i, 1);
        continue;
      }

      if (outcome === 'hitWorld') {
        createSparkBurst(p.mesh.position, 0xf97316, 12);
        releaseProjectileMesh(p.mesh);
        minionProjectiles.splice(i, 1);
      }
    }
  }
}
