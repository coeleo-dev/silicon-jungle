/**
 * SpiderBotEntity — Inimigo Robô Aracnídeo com Cinemática Realista de 6 Pernas
 * Modelo PBR aterrado com patas cravadas no solo (Y=0) e marcha tripé alternada.
 */
import { EnemyEntity } from '../base/EnemyEntity.js?v=20260830';
import { scene, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { createSparkBurst } from '../../utils/particles.js?v=20260821';
import { showHitmarker, showBanner, setEnemyTargetMeshes } from '../../ui/hud.js?v=20260912';
import { spawnPowerCore } from '../../world/collectibles.js?v=20260912';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { eventBus } from '../../core/EventBus.js?v=20260821';
import { distToSegmentSquared } from '../../utils/math.js?v=20260821';
import { applyToonOutlines } from '../../core/outline.js?v=20260826';
import { acquireProjectileMesh, releaseProjectileMesh } from '../../combat/ProjectilePool.js?v=20260821';
import { shouldFireWeb, enemyProjectileOutcome } from '../../combat/losPolicy.js?v=20260821';
import { enemyHp, enemyDamage } from '../../config/combatBalance.js?v=20260821';
import { resolveEntitySpawn } from '../../world/spawnResolver.js?v=20260821';

export const spiderBots = [];
export const activeLaserTraps = [];
export const activeWebProjectiles = [];

const _tempBitePos = new THREE.Vector3();
const _nozzlePos = new THREE.Vector3();
const _sparkPos = new THREE.Vector3();
const _webPrevPos = new THREE.Vector3();

const webProjGeo = new THREE.SphereGeometry(0.35, 6, 6);
const webProjMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });

export function createLaserWebTrap(x, z, duration = 12.0) {
  const y = worldService.getHeight(x, z);
  const trapGroup = new THREE.Group();

  const webGeo = new THREE.RingGeometry(0.3, 2.8, 8, 3);
  const webMat = new THREE.MeshBasicMaterial({
    color: 0xff0055,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });

  const webMesh = new THREE.Mesh(webGeo, webMat);
  webMesh.rotation.x = -Math.PI / 2;
  webMesh.position.y = 0.08;
  trapGroup.add(webMesh);

  trapGroup.position.set(x, y, z);
  scene.add(trapGroup);

  const trapData = {
    group: trapGroup,
    mesh: webMesh,
    x: x,
    z: z,
    timer: duration,
    cut: () => {
      trapData.timer = 0;
      scene.remove(trapGroup);
      createSparkBurst(trapGroup.position, 0xff0055, 18);
      audioService.knifeSlash();
    }
  };

  activeLaserTraps.push(trapData);
  return trapData;
}

export function shootWebProjectile(startPos, targetPos) {
  audioService.webSpit();

  const pMesh = acquireProjectileMesh(webProjGeo, webProjMat);
  pMesh.position.copy(startPos);
  scene.add(pMesh);

  const dir = targetPos.clone().sub(startPos);
  const dist = dir.length();
  dir.normalize();

  activeWebProjectiles.push({
    mesh: pMesh,
    start: startPos.clone(),
    target: targetPos.clone(),
    dir: dir,
    speed: 38.0,
    traveled: 0,
    maxDist: dist
  });
}

export class SpiderBotEntity extends EnemyEntity {
  constructor(x, z, patrolRadius = 10) {
    const spawn = resolveEntitySpawn(x, z, 0.7);
    const hp = enemyHp('spider_bot');
    super({
      type: 'spider_bot',
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      hp,
      maxHp: hp,
      speed: 5.5,
      patrolRadius: patrolRadius,
      aggroRange: 28,
      leashRange: 38,
      lootTable: [{ resource: 'copperWires', amount: 1 }]
    });

    this.groundOffset = 0.55;
    this.hitCenterY = 0.5;
    this.webCooldown = 2.0 + Math.random() * 2.0;
    this.legs = [];
    this.bodyMesh = null;
    this.torsoGroup = null;

    // Pontos fracos (Fase 3): diodo ciano no topo (core ×3) e cúpula/olhos (head ×2)
    this.weakPoints = [
      { name: 'core', yMin: 0.85, yMax: Infinity, mult: 3 },
      { name: 'head', yMin: 0.55, yMax: 0.85, mult: 2 }
    ];
    this.biteWindup = 0;
    this.biteLunge = false;
    this.hitTimer = 0;

    this.buildModel();
    applyToonOutlines(this.torsoGroup, 0.04, 0);

    spiderBots.push(this);
  }

  buildModel() {
    const metalMat = TOON_MATERIALS.METAL_BRUSHED_STEEL;
    const copperMat = createCelMaterial(0xd97706);
    const rubyMat = new THREE.MeshBasicMaterial({ color: 0xff0055 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    this.eyeMat = rubyMat;
    this.coreMat = coreMat;

    // 1. Chassi e Torso Central (Posicionado a 0.50m do solo)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.y = 0.50;
    this.group.add(this.torsoGroup);

    // Cefalotórax de Titânio
    const bodyGeo = new THREE.CylinderGeometry(0.52, 0.68, 0.32, 8);
    this.bodyMesh = new THREE.Mesh(bodyGeo, metalMat);
    this.bodyMesh.castShadow = true;
    this.torsoGroup.add(this.bodyMesh);

    // Cúpula Superior
    const domeGeo = new THREE.SphereGeometry(0.50, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, metalMat);
    dome.position.y = 0.16;
    dome.castShadow = true;
    this.torsoGroup.add(dome);

    // Reator Central Ciano
    const diodeGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 8);
    const diode = new THREE.Mesh(diodeGeo, coreMat);
    diode.position.y = 0.38;
    this.torsoGroup.add(diode);

    // 2. Cabeça / Sensor Ocular Frontal (+Z é para a frente)
    const headGeo = new THREE.BoxGeometry(0.44, 0.24, 0.32);
    const head = new THREE.Mesh(headGeo, metalMat);
    head.position.set(0, 0.04, 0.50);
    this.torsoGroup.add(head);

    // 6 Olhos Ruby de Predador
    const eyeGeo = new THREE.SphereGeometry(0.055, 6, 6);
    [-0.14, 0, 0.14].forEach(ox => {
      [-0.05, 0.05].forEach(oy => {
        const eye = new THREE.Mesh(eyeGeo, rubyMat);
        eye.position.set(ox, 0.04 + oy, 0.66);
        this.torsoGroup.add(eye);
      });
    });

    // 3. Fiandeira Traseira (-Z é para trás)
    const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.38, 6);
    const nozzle = new THREE.Mesh(nozzleGeo, copperMat);
    nozzle.position.set(0, -0.04, -0.62);
    nozzle.rotation.x = -Math.PI / 3;
    this.torsoGroup.add(nozzle);

    // 4. Geometrias das Pernas Orientadas ao longo do eixo +X local
    const coxaLen = 0.25;
    const femurLen = 0.55;
    const tibiaLen = 0.90;

    const coxaGeo = new THREE.CylinderGeometry(0.06, 0.07, coxaLen, 6);
    coxaGeo.rotateZ(-Math.PI / 2);
    coxaGeo.translate(coxaLen / 2, 0, 0);

    const femurGeo = new THREE.CylinderGeometry(0.05, 0.06, femurLen, 6);
    femurGeo.rotateZ(-Math.PI / 2);
    femurGeo.translate(femurLen / 2, 0, 0);

    const tibiaGeo = new THREE.CylinderGeometry(0.02, 0.05, tibiaLen, 6);
    tibiaGeo.rotateZ(-Math.PI / 2);
    tibiaGeo.translate(tibiaLen / 2, 0, 0);

    const clawGeo = new THREE.ConeGeometry(0.04, 0.12, 6);
    clawGeo.rotateZ(-Math.PI / 2);
    clawGeo.translate(0.06, 0, 0);

    // 5. Configuração das 6 Pernas Radiais (3 à esquerda, 3 à direita)
    const legConfigs = [
      { name: 'LF', angle: Math.PI * (35 / 180),  phase: 0 },          // 0. Esquerda-Frente (Tripé A)
      { name: 'LM', angle: 0,                     phase: Math.PI },    // 1. Esquerda-Meio   (Tripé B)
      { name: 'LR', angle: Math.PI * (-35 / 180), phase: 0 },          // 2. Esquerda-Trás   (Tripé A)
      { name: 'RF', angle: Math.PI * (145 / 180), phase: Math.PI },    // 3. Direita-Frente  (Tripé B)
      { name: 'RM', angle: Math.PI,               phase: 0 },          // 4. Direita-Meio    (Tripé A)
      { name: 'RR', angle: Math.PI * (215 / 180), phase: Math.PI }     // 5. Direita-Trás    (Tripé B)
    ];

    const rBody = 0.55;

    legConfigs.forEach((cfg) => {
      // Ponto de fixação na borda do corpo
      const legRoot = new THREE.Group();
      legRoot.position.set(
        Math.cos(cfg.angle) * rBody,
        0,
        Math.sin(cfg.angle) * rBody
      );
      // Rotação Y para que o eixo +X local aponte radialmente para FORA do corpo
      legRoot.rotation.y = -cfg.angle;

      // Segmento 1: Coxa Horizontal
      const coxaMesh = new THREE.Mesh(coxaGeo, copperMat);
      legRoot.add(coxaMesh);

      // Segmento 2: Fêmur (Pivot na ponta da coxa, inclinado +35° para CIMA)
      const femurPivot = new THREE.Group();
      femurPivot.position.set(coxaLen, 0, 0);
      femurPivot.rotation.z = Math.PI * (35 / 180); // +35° para cima

      const femurMesh = new THREE.Mesh(femurGeo, metalMat);
      femurMesh.castShadow = false;
      femurPivot.add(femurMesh);
      legRoot.add(femurPivot);

      // Segmento 3: Tíbia / Garra (Pivot no joelho, inclinado -100° para BAIXO até o solo)
      const tibiaPivot = new THREE.Group();
      tibiaPivot.position.set(femurLen, 0, 0);
      tibiaPivot.rotation.z = Math.PI * (-100 / 180); // -100° relativo ao fêmur (-65° relativo ao solo)

      const tibiaMesh = new THREE.Mesh(tibiaGeo, copperMat);
      tibiaMesh.castShadow = false;
      tibiaPivot.add(tibiaMesh);

      // Garra afiada na ponta da tíbia tocando o chão em Y=0.0m
      const clawMesh = new THREE.Mesh(clawGeo, metalMat);
      clawMesh.position.set(tibiaLen, 0, 0);
      tibiaPivot.add(clawMesh);

      femurPivot.add(tibiaPivot);

      this.torsoGroup.add(legRoot);

      this.legs.push({
        root: legRoot,
        femurPivot: femurPivot,
        tibiaPivot: tibiaPivot,
        baseAngle: cfg.angle,
        phase: cfg.phase
      });
    });

    this.biteCooldown = 0;
    this.bodyMesh.userData = { enemyRef: this, isSpiderBot: true };
  }

  chase(delta, playerPos, distToPlayer, ctx) {
    super.chase(delta, playerPos, distToPlayer, ctx);
    this.onChaseTick(delta, playerPos, distToPlayer, ctx);
  }

  onChaseTick(delta, playerPos, distToPlayer, ctx) {
    this.biteCooldown -= delta;

    if (distToPlayer <= 2.8) {
      if (this.biteCooldown <= 0 && this.biteWindup <= 0) {
        this.biteWindup = 0.5;
        this.biteCooldown = 0.9;
        this.biteLunge = true;
      }

      if (this.biteWindup > 0) {
        this.biteWindup -= delta;
        // Sinal visual de preparação: olhos/core piscam para branco + leve avanço do torso
        if (this.eyeMat) this.eyeMat.color.setHex(this.biteWindup > 0.25 ? 0xffffff : 0xff0055);
        if (this.coreMat) this.coreMat.color.setHex(this.biteWindup > 0.25 ? 0xffffff : 0x00f0ff);
        if (this.torsoGroup) this.torsoGroup.position.z = 0.12;
      } else if (this.biteWindup <= 0 && this.biteLunge) {
        this.biteLunge = false;
        if (this.torsoGroup) this.torsoGroup.position.z = 0;
        if (this.eyeMat) this.eyeMat.color.setHex(0xff0055);
        if (this.coreMat) this.coreMat.color.setHex(0x00f0ff);
        if (typeof ctx?.takeDamage === 'function') {
          ctx.takeDamage(enemyDamage('spider_bot', 'bite'));
        }
        eventBus.emit('combat:attacked', { source: this.group.position.clone() });
        _tempBitePos.copy(this.group.position);
        _tempBitePos.y += 0.5;
        createSparkBurst(_tempBitePos, 0xef4444, 20);
        audioService.webSpit();
      }
    }

    this.webCooldown -= delta;
    if (this.webCooldown <= 0 && distToPlayer > 6 && distToPlayer < 24) {
      _nozzlePos.copy(this.group.position);
      _nozzlePos.y += 0.5;
      const hasLos = worldService.hasLineOfSight(_nozzlePos, playerPos);
      if (shouldFireWeb({ hasLos, dist: distToPlayer })) {
        this.webCooldown = 4.0 + Math.random() * 2.0;
        shootWebProjectile(_nozzlePos, playerPos);
      } else {
        this.webCooldown = 0.25;
      }
    }
  }

  setLimbsVisible(visible) {
    const legs = this.legs;
    if (!legs) return;
    for (let i = 0; i < legs.length; i++) {
      if (legs[i].root) legs[i].root.visible = visible;
    }
  }

  /**
   * Cinemática de Marcha Tripé Alternada Autêntica de Aranha Mecânica
   */
  updateAnimation(delta, time) {
    if (this.hitTimer > 0) {
      this.hitTimer -= delta;
      const flash = this.hitTimer > 0;
      if (this.eyeMat) this.eyeMat.color.setHex(flash ? 0xffffff : 0xff0055);
      if (this.coreMat) this.coreMat.color.setHex(flash ? 0xffffff : 0x00f0ff);
    }

    if (this.torsoGroup) {
      this.torsoGroup.position.y = 0.50 + Math.abs(Math.sin(this.walkTime * 2)) * 0.03;
    }

    if (this._updateLod >= 1) return;

    const baseFemurZ = Math.PI * (35 / 180);
    const baseTibiaZ = Math.PI * (-100 / 180);

    this.legs.forEach(leg => {
      const stepPhase = this.walkTime + leg.phase;
      const swing = Math.sin(stepPhase);
      const stride = Math.cos(stepPhase);

      // 1. Passo horizontal (avanço/recuo tangencial)
      leg.root.rotation.y = -leg.baseAngle + stride * 0.22;

      // 2. Elevação do joelho na fase de swing (quando swing > 0)
      const lift = Math.max(0, swing) * 0.32;
      const plant = Math.min(0, swing) * 0.04;
      leg.femurPivot.rotation.z = baseFemurZ + lift + plant;

      // 3. Flexão da garra para cravar no solo
      leg.tibiaPivot.rotation.z = baseTibiaZ - lift * 0.35;
    });
  }

  takeDamage(amount, hitPoint = null, hitObject = null, gameContext = null) {
    if (this.isDead) return;

    showHitmarker();
    this.hitTimer = 0.12;

    if (hitPoint) {
      _sparkPos.copy(hitPoint);
    } else {
      _sparkPos.copy(this.group.position);
      _sparkPos.y += 0.5;
    }
    createSparkBurst(_sparkPos, 0xff0055, 18);

    super.takeDamage(amount, hitPoint, hitObject, gameContext);
  }

  die(gameContext = null) {
    if (this.isDead) return;

    _sparkPos.copy(this.group.position);
    _sparkPos.y += 0.5;
    createSparkBurst(_sparkPos, 0x00ffaa, 35);

    spawnPowerCore(this.group.position.x, this.group.position.z, gameContext);
    showBanner('🕷️ Spider-Bot destroyed! (+1 cell and 1 copper wire)', '💥');

    const idx = spiderBots.indexOf(this);
    if (idx !== -1) spiderBots.splice(idx, 1);

    super.die(gameContext);
  }

  despawnSilent() {
    if (this.isDead) return;
    super.despawnSilent();
    const idx = spiderBots.indexOf(this);
    if (idx !== -1) spiderBots.splice(idx, 1);
    setEnemyTargetMeshes(spiderBots.map((b) => b.bodyMesh).filter(Boolean));
  }

  static spawnAll() {
    const spawnPoints = [
      [0, 55], [0, 85], [0, 115],
      [0, -55], [0, -85], [0, -115],
      [55, 0], [85, 0], [115, 0],
      [-55, 0], [-85, 0], [-115, 0],
      [-40, 50], [40, 50], [-40, -50], [40, -50],
      [-70, 70], [70, 70], [-70, -70], [70, -70],
      [-100, 45], [100, 45], [-100, -45], [100, -45]
    ];

    spawnPoints.forEach(pt => {
      new SpiderBotEntity(pt[0], pt[1]);
    });

    const targetMeshes = spiderBots.map(b => b.bodyMesh);
    setEnemyTargetMeshes(targetMeshes);
  }

  static updateTrapsAndProjectiles(delta, player) {
    const playerPos = player?.camera?.position || (typeof camera !== 'undefined' ? camera.position : null);
    if (!playerPos) return;

    for (let i = activeLaserTraps.length - 1; i >= 0; i--) {
      const trap = activeLaserTraps[i];
      trap.timer -= delta;
      trap.mesh.rotation.z += delta * 0.8;

      if (trap.timer <= 0) {
        scene.remove(trap.group);
        activeLaserTraps.splice(i, 1);
        continue;
      }

      if (Math.hypot(playerPos.x - trap.x, playerPos.z - trap.z) < 2.4) {
        if (player.applySlow) {
          player.applySlow(0.45, 2.5);
        }
      }
    }

    for (let i = activeWebProjectiles.length - 1; i >= 0; i--) {
      const p = activeWebProjectiles[i];
      const step = p.speed * delta;
      _webPrevPos.copy(p.mesh.position);
      p.mesh.position.addScaledVector(p.dir, step);
      p.traveled += step;

      const playerHit = distToSegmentSquared(playerPos, _webPrevPos, p.mesh.position) <= 1.4 * 1.4;
      const losToPlayer = playerHit && worldService.hasLineOfSight(_webPrevPos, playerPos);
      const losAlongStep = losToPlayer || worldService.hasLineOfSight(_webPrevPos, p.mesh.position);
      const outcome = enemyProjectileOutcome({ playerHit, losToPlayer, losAlongStep });

      if (outcome === 'hitPlayer') {
        eventBus.emit('combat:attacked', { source: p.mesh.position.clone() });
        if (player.takeDamage) player.takeDamage(enemyDamage('spider_bot', 'web'));
        if (player.applySlow) player.applySlow(0.45, 3.0);
        createLaserWebTrap(playerPos.x, playerPos.z, 10.0);
        releaseProjectileMesh(p.mesh);
        activeWebProjectiles.splice(i, 1);
        continue;
      }

      if (outcome === 'hitWorld') {
        createSparkBurst(p.mesh.position, 0xff0055, 12);
        releaseProjectileMesh(p.mesh);
        activeWebProjectiles.splice(i, 1);
        continue;
      }

      if (p.traveled >= p.maxDist || p.traveled > 45) {
        createLaserWebTrap(p.mesh.position.x, p.mesh.position.z, 8.0);
        releaseProjectileMesh(p.mesh);
        activeWebProjectiles.splice(i, 1);
      }
    }
  }
}
