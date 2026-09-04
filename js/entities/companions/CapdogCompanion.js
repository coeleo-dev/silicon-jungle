/**
 * CapdogCompanion — Mascote e Companheiro Fiel (Cãozinho Capacitor)
 * Herda de CompanionEntity. Oferece auxílio tático, alerta por radar e mordida elétrica paralisante.
 */
import { CompanionEntity } from '../base/CompanionEntity.js?v=20260830';
import { scene, camera, createCelMaterial } from '../../core/scene.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { createSparkBurst } from '../../utils/particles.js?v=20260821';
import { showBanner } from '../../ui/hud.js?v=20260912';
import { inventory } from '../inventory.js?v=20260912';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { entityRegistry } from '../../core/EntityRegistry.js?v=20260830';
import { damageResolver } from '../../combat/DamageResolver.js?v=20260821';
import { interactiveRegistry } from '../../core/InteractiveRegistry.js?v=20260821';
import { applyToonOutlinesToMeshes } from '../../core/outline.js?v=20260826';
import { resolveEntitySpawn } from '../../world/spawnResolver.js?v=20260821';
import { pickSteerDir, headingFromXZ, lerpAngle } from '../../utils/steer.js?v=20260826';
import { resolvePlayerPos } from '../../utils/playerPos.js?v=20260821';
import {
  pickCompanionWanderPoint,
  shouldCatchUp,
  pickWanderPause,
  CATCH_UP_DIST,
  WANDER_MIN_R,
  WANDER_MAX_R,
  WANDER_ARRIVE_DIST,
  WANDER_SPEED_SCALE
} from '../../utils/companionWander.js?v=20260831';

export let capdogInstance = null;

const _cDir = new THREE.Vector3();
const _cPos = new THREE.Vector3();

export class CapdogCompanion extends CompanionEntity {
  constructor(startX = -12, startZ = -10) {
    const spawn = resolveEntitySpawn(startX, startZ, 0.6);
    super({
      type: 'companion',
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      hp: 100,
      maxHp: 100,
      speed: 9.5,
      followDistance: 3.5
    });

    this.damage = 25;
    this.isTamed = true;
    this.state = 'FOLLOW'; // FOLLOW, ATTACK, KNOCKED_OUT
    this.speed = 9.5;
    this.followDistance = 3.5;
    this.attackTarget = null;
    this.attackCooldown = 0;
    this.radarAlertCooldown = 0;
    this.walkAnimTime = 0;
    this.tailWagTime = 0;
    this.wanderTarget = null;
    this.wanderPause = 0;
    this.wanderLookYaw = 0;

    // Componentes de modelo
    this.chestMesh = null;
    this.headMesh = null;
    this.eyeMat = null;
    this.legs = [];
    this.tailPivot = null;

    this.buildModel();
    applyToonOutlinesToMeshes([this.chestMesh, this.headMesh], 0.035);

    capdogInstance = this;
  }

  buildModel() {
    const fur = createCelMaterial(0xc47a3a);
    const furDark = createCelMaterial(0x6b3a1f);
    const furLight = createCelMaterial(0xe8d0a8);
    const copper = createCelMaterial(0xd97706);
    const band = createCelMaterial(0xf1f5f9);
    const pad = createCelMaterial(0x3f2a1a);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee });

    // Focinho em +Z — alinhado a headingFromXZ (yaw 0 anda para frente).
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 10), fur);
    chest.position.set(0, 0.5, 0.12);
    chest.scale.set(0.95, 0.92, 1.15);
    chest.castShadow = true;
    this.chestMesh = chest;
    this.group.add(chest);

    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), fur);
    hips.position.set(0, 0.46, -0.18);
    hips.scale.set(0.95, 0.88, 1.12);
    hips.castShadow = true;
    this.group.add(hips);

    const chestPatch = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), furLight);
    chestPatch.position.set(0, 0.42, 0.28);
    chestPatch.scale.set(0.75, 0.55, 0.4);
    this.group.add(chestPatch);

    const capBand = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.18), band);
    capBand.position.set(0.22, 0.52, -0.02);
    this.group.add(capBand);
    const capCopper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.06), copper);
    capCopper.position.set(0.24, 0.52, -0.02);
    this.group.add(capCopper);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.2, 8), fur);
    neck.position.set(0, 0.64, 0.3);
    neck.rotation.x = 0.55;
    neck.castShadow = true;
    this.group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), fur);
    head.position.set(0, 0.8, 0.46);
    head.scale.set(0.95, 0.9, 1.05);
    head.castShadow = true;
    this.headMesh = head;
    this.group.add(head);

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), furLight);
    snout.position.set(0, 0.74, 0.64);
    snout.scale.set(0.8, 0.65, 1.15);
    this.group.add(snout);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({ color: 0x1c1410 }));
    nose.position.set(0, 0.74, 0.76);
    this.group.add(nose);

    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    leftEye.position.set(0.08, 0.86, 0.6);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    rightEye.position.set(-0.08, 0.86, 0.6);
    this.group.add(rightEye);

    const earGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const leftEar = new THREE.Mesh(earGeo, furDark);
    leftEar.position.set(0.13, 0.96, 0.4);
    leftEar.scale.set(0.5, 1.15, 0.4);
    leftEar.rotation.z = 0.4;
    this.group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, furDark);
    rightEar.position.set(-0.13, 0.96, 0.4);
    rightEar.scale.set(0.5, 1.15, 0.4);
    rightEar.rotation.z = -0.4;
    this.group.add(rightEar);

    const upperGeo = new THREE.CylinderGeometry(0.055, 0.06, 0.22, 8);
    const lowerGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.2, 8);
    const pawGeo = new THREE.BoxGeometry(0.1, 0.05, 0.12);
    const legSpots = [
      { name: 'FL', x: 0.15, z: 0.22 },
      { name: 'FR', x: -0.15, z: 0.22 },
      { name: 'BL', x: 0.15, z: -0.2 },
      { name: 'BR', x: -0.15, z: -0.2 }
    ];
    legSpots.forEach((pos, idx) => {
      const pivot = new THREE.Group();
      pivot.position.set(pos.x, 0.42, pos.z);
      const upper = new THREE.Mesh(upperGeo, furDark);
      upper.position.y = -0.1;
      upper.castShadow = false;
      pivot.add(upper);
      const lower = new THREE.Mesh(lowerGeo, fur);
      lower.position.y = -0.28;
      pivot.add(lower);
      const paw = new THREE.Mesh(pawGeo, pad);
      paw.position.y = -0.4;
      pivot.add(paw);
      this.group.add(pivot);
      this.legs.push({
        pivot,
        name: pos.name,
        basePhase: (idx % 2 === 0 ? 0 : Math.PI)
      });
    });

    this.tailPivot = new THREE.Group();
    this.tailPivot.position.set(0, 0.54, -0.34);
    const t0 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), furDark);
    t0.position.set(0, 0.04, -0.06);
    this.tailPivot.add(t0);
    const t1 = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), fur);
    t1.position.set(0, 0.1, -0.14);
    this.tailPivot.add(t1);
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 6, 10), copper);
      ring.position.set(0, 0.14 + i * 0.03, -0.2 - i * 0.06);
      ring.rotation.x = Math.PI / 2;
      this.tailPivot.add(ring);
    }
    const tailLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ffaa }));
    tailLed.position.set(0, 0.22, -0.4);
    this.tailPivot.add(tailLed);
    this.group.add(this.tailPivot);

    const capdogUserData = {
      type: 'capdog',
      name: 'Capdog (Capacitor Pup)',
      prompt: '[E] OFFER ENERGY CELL (TAME)',
      getPrompt: () => this.getPromptText(),
      action: () => this.interact()
    };

    this.group.userData = capdogUserData;
    chest.userData = capdogUserData;
    head.userData = capdogUserData;

    interactiveRegistry.register(this.group);
    interactiveRegistry.register(chest);
    interactiveRegistry.register(head);
  }

  getPromptText() {
    if (!this.isTamed) {
      return '[E] OFFER ENERGY CELL (TAME CAPDOG)';
    }
    if (this.state === 'KNOCKED_OUT') {
      return '[E] REVIVE CAPDOG WITH AN ENERGY CELL';
    }
    if (this.hp < this.maxHp) {
      return `[E] HEAL CAPDOG (+40 HP) [${Math.round(this.hp)}/${this.maxHp}]`;
    }
    return `[E] PET CAPDOG (LEVEL ${this.level})`;
  }

  interact() {
    // 1. DOMESTICAÇÃO
    if (!this.isTamed) {
      const energyCount = inventory.getResource('energyCells');
      if (energyCount > 0) {
        inventory.consumeResource('energyCells', 1);
        this.isTamed = true;
        this.state = 'FOLLOW';
        audioService.play('playCapdogBark');
        if (this.eyeMat) this.eyeMat.color.setHex(0x00ffaa);
        createSparkBurst(this.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x00ffaa, 35);
        showBanner('🐕 Capdog tamed! Loyal companion linked to your circuit!', '⚡');
      } else {
        showBanner('⚠️ Need 1× Energy Cell to tame Capdog!', '🔋');
      }
      return;
    }

    // 2. REANIMAR
    if (this.state === 'KNOCKED_OUT') {
      const energyCount = inventory.getResource('energyCells');
      if (energyCount > 0) {
        inventory.consumeResource('energyCells', 1);
        this.state = 'FOLLOW';
        this.hp = this.maxHp * 0.6;
        audioService.play('playCapdogBark');
        if (this.eyeMat) this.eyeMat.color.setHex(0x00ffaa);
        createSparkBurst(this.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x00ffaa, 30);
        showBanner('🐕 Capdog revived and ready to fight!', '⚡');
      } else {
        showBanner('⚠️ Need 1× Energy Cell to revive Capdog!', '🔋');
      }
      return;
    }

    // 3. CURAR
    if (this.hp < this.maxHp) {
      const energyCount = inventory.getResource('energyCells');
      if (energyCount > 0) {
        inventory.consumeResource('energyCells', 1);
        this.hp = Math.min(this.maxHp, this.hp + 40);
        audioService.collect();
        createSparkBurst(this.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x00ffaa, 20);
        showBanner(`💚 Capdog healed! HP: ${Math.round(this.hp)}/${this.maxHp}`, '🐕');
      } else {
        showBanner('⚠️ Need 1× Energy Cell to heal Capdog!', '🔋');
      }
      return;
    }

    // 4. ACARICIAR
    audioService.play('playCapdogBark');
    this.tailWagTime = 3.0;
    createSparkBurst(this.group.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0xfacc15, 15);
    showBanner('🐕 *Woof!* Capdog is happy and ready to fight!', '💖');
  }

  moveSteered(target, delta, speed, radius = 0.55) {
    const look = Math.min(1.8, speed * delta * 3.5);
    const steered = pickSteerDir(
      this.group.position.x,
      this.group.position.z,
      target.x,
      target.z,
      (dx, dz) => {
        _cPos.set(
          this.group.position.x + dx * look,
          this.group.position.y,
          this.group.position.z + dz * look
        );
        return worldService.checkEntityCollision(_cPos, radius);
      }
    );
    this.group.rotation.y = lerpAngle(this.group.rotation.y, headingFromXZ(steered.dx, steered.dz), Math.min(1, delta * 12));
    _cPos.set(
      this.group.position.x + steered.dx * speed * delta,
      this.group.position.y,
      this.group.position.z + steered.dz * speed * delta
    );
    if (!worldService.checkEntityCollision(_cPos, radius)) {
      this.group.position.copy(_cPos);
      return true;
    }
    return false;
  }

  chooseWanderTarget(playerPos) {
    const y = this.group.position.y;
    for (let i = 0; i < 8; i++) {
      const p = pickCompanionWanderPoint(playerPos.x, playerPos.z, WANDER_MIN_R, WANDER_MAX_R);
      _cPos.set(p.x, y, p.z);
      if (!worldService.checkEntityCollision(_cPos, 0.55)) {
        this.wanderTarget = p;
        this.wanderPause = 0;
        return;
      }
    }
  }

  updateStandbyFollow(delta, playerPos) {
    const distToPlayer = this.distanceTo(playerPos);

    if (shouldCatchUp(distToPlayer, CATCH_UP_DIST)) {
      this.wanderTarget = null;
      this.wanderPause = 0;
      if (this.moveSteered(playerPos, delta, this.speed, 0.55)) {
        this.walkAnimTime += delta * 12;
      }
      return;
    }

    if (this.wanderTarget) {
      const leash = Math.hypot(
        this.wanderTarget.x - playerPos.x,
        this.wanderTarget.z - playerPos.z
      );
      if (leash > WANDER_MAX_R + 1.2) this.wanderTarget = null;
    }

    this.wanderPause = Math.max(0, this.wanderPause - delta);

    if (this.wanderPause > 0) {
      this.group.rotation.y = lerpAngle(
        this.group.rotation.y,
        this.wanderLookYaw,
        Math.min(1, delta * 6)
      );
      return;
    }

    if (!this.wanderTarget) {
      this.chooseWanderTarget(playerPos);
    }
    if (!this.wanderTarget) return;

    const pos = this.group.position;
    const distT = Math.hypot(this.wanderTarget.x - pos.x, this.wanderTarget.z - pos.z);
    if (distT <= WANDER_ARRIVE_DIST) {
      this.wanderPause = pickWanderPause();
      const lx = this.wanderTarget.x - pos.x;
      const lz = this.wanderTarget.z - pos.z;
      this.wanderLookYaw = headingFromXZ(lx, lz) + (Math.random() - 0.5) * 0.9;
      this.wanderTarget = null;
      return;
    }

    const moved = this.moveSteered(this.wanderTarget, delta, this.speed * WANDER_SPEED_SCALE, 0.55);
    if (moved) this.walkAnimTime += delta * 10;
  }

  update(delta, time, ctx) {
    const playerPos = resolvePlayerPos(ctx, camera);

    // Abanar cauda
    if (this.isTamed && this.state !== 'KNOCKED_OUT' && this.tailPivot) {
      const wagSpeed = (this.tailWagTime > 0 || this.state === 'ATTACK') ? 22 : 8;
      this.tailPivot.rotation.y = Math.sin(time * wagSpeed) * 0.45;
      if (this.tailWagTime > 0) this.tailWagTime -= delta;
    }

    if (this.state === 'KNOCKED_OUT') {
      if (this.eyeMat) this.eyeMat.color.setHex(0x1e293b);
      this.group.rotation.z = Math.PI / 2;
      this.alignToTerrain(worldService, 0.3);
      return;
    } else {
      this.group.rotation.z = 0;
    }

    this.attackCooldown -= delta;
    this.radarAlertCooldown -= delta;

    if (!this.isTamed) {
      if (this.eyeMat) this.eyeMat.color.setHex(0x38bdf8);
      this.group.rotation.y = Math.sin(time * 1.2) * 0.4;
      this.alignToTerrain(worldService);
      return;
    }

    const nearbyEnemies = entityRegistry.getNearbyEnemies(this.group.position, 22);

    let closestEnemy = null;
    let closestDist = 999;

    for (let i = 0; i < nearbyEnemies.length; i++) {
      const e = nearbyEnemies[i];
      if (!e.isDead) {
        const d = this.distanceTo(e.position);
        if (d < closestDist) {
          closestDist = d;
          closestEnemy = e;
        }
      }
    }

    // Alerta de Radar
    if (closestEnemy && this.radarAlertCooldown <= 0 && closestDist > 14) {
      this.radarAlertCooldown = 6.0;
      audioService.play('playCapdogBark');
      if (this.eyeMat) this.eyeMat.color.setHex(0xf59e0b);
      showBanner('🐕 Capdog barked! Enemies nearby!', '⚠️');
    }

    const distToPlayer = playerPos ? this.distanceTo(playerPos) : 0;

    if (closestEnemy && (closestDist <= 14 || distToPlayer < 12)) {
      this.state = 'ATTACK';
      this.attackTarget = closestEnemy;
      this.wanderTarget = null;
      this.wanderPause = 0;
    } else {
      this.state = 'FOLLOW';
      this.attackTarget = null;
    }

    if (this.state === 'ATTACK' && this.attackTarget && !this.attackTarget.isDead) {
      if (this.eyeMat) this.eyeMat.color.setHex(0xef4444);
      const targetPos = this.attackTarget.position;

      _cDir.copy(targetPos).sub(this.group.position).setY(0);
      const distToTarget = _cDir.length();
      _cDir.normalize();

      this.group.rotation.y = lerpAngle(this.group.rotation.y, headingFromXZ(_cDir.x, _cDir.z), Math.min(1, delta * 10));

      if (distToTarget > 1.8) {
        if (this.moveSteered(targetPos, delta, this.speed * 1.25, 0.55)) {
          this.walkAnimTime += delta * 16;
        }
      } else {
        // Mordida Elétrica com Choque Paralisante
        if (this.attackCooldown <= 0) {
          this.attackCooldown = 1.6;
          audioService.play('playCapdogBite') || audioService.play('playCapdogZap');
          createSparkBurst(targetPos, 0x00f0ff, 25);

          this.attackTarget.takeDamage(this.damage, targetPos, null, ctx?.gameContext);
          if (typeof this.attackTarget.applyStun === 'function') {
            this.attackTarget.applyStun(1.5);
          }
          showBanner(`⚡ Capdog attacked ${this.attackTarget.type}! (${this.damage} damage + stun shock!)`, '🐕');
        }
      }
    } else if (playerPos) {
      if (this.eyeMat) this.eyeMat.color.setHex(0x00ffaa);
      this.updateStandbyFollow(delta, playerPos);
    }

    this.alignToTerrain(worldService);

    this.legs.forEach(leg => {
      leg.pivot.rotation.x = Math.sin(this.walkAnimTime + leg.basePhase) * 0.5;
    });
  }

  static spawn(startX = -12, startZ = -10) {
    return new CapdogCompanion(startX, startZ);
  }
}
