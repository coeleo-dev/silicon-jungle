/**
 * collectibles.js — Células de Energia, Fios de Cobre Caídos, Cristais de Clock e Abrigos de Resistores
 * Integrado ao WorldService, AudioService e StructureManager com colheita via [E].
 */
import { scene, createCelMaterial } from '../core/scene.js?v=20260821';
import { audioService } from '../core/AudioService.js?v=20260821';
import { showBanner, updateCollectedCount } from '../ui/hud.js?v=20260912';
import { CONFIG } from '../config/constants.js?v=20260821';
import { inventory } from '../entities/inventory.js?v=20260912';
import { worldService } from '../core/WorldService.js?v=20260821';
import { createSparkBurst } from '../utils/particles.js?v=20260821';
import { TOON_MATERIALS } from '../core/textures.js?v=20260821';
import { resolveEntitySpawn } from './spawnResolver.js?v=20260821';
import { interactiveRegistry } from '../core/InteractiveRegistry.js?v=20260821';
import { eventBus } from '../core/EventBus.js?v=20260821';
import { BiomeDistributor } from './vegetation/BiomeDistributor.js?v=20260821';
import { getBiomeAt, BIOME_CENTERS } from './biomeMap.js?v=20260904';
import { exclusiveResource, EXCLUSIVE_LABEL, EXCLUSIVE_COLOR } from './biomeLoot.js?v=20260904';

export const powerCores = [];
export const fallenCopperWires = [];
export const groundCrystals = [];
export const exclusivePickups = [];
let collectedCoresCount = 0;

const RESPAWN = { powerCore: 120, copperWire: 60, crystal: 90 };

export function getCollectedCount() {
  return collectedCoresCount;
}

/**
 * 1. Células de Energia (Data Cores Flutuantes)
 */
function placeCollectible(rawX, rawZ, radius) {
  return resolveEntitySpawn(rawX, rawZ, radius, {
    ignoreCategories: ['ROAD', 'SIDEWALK', 'SAFE_ZONE'],
    maxDistance: 16
  });
}

export function spawnPowerCore(rawX, rawZ, gameContext = null) {
  const valid = placeCollectible(rawX, rawZ, 0.8);
  const x = valid.x;
  const z = valid.z;
  const y = valid.y;
  const coreGroup = new THREE.Group();

  const octaGeo = new THREE.OctahedronGeometry(0.85, 0);
  const octaMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const octaMesh = new THREE.Mesh(octaGeo, octaMat);
  octaMesh.position.y = 1.4;
  coreGroup.add(octaMesh);

  const ringGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 24);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd24d });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 1.4;
  ringMesh.rotation.x = Math.PI / 3;
  coreGroup.add(ringMesh);

  coreGroup.position.set(x, y, z);
  scene.add(coreGroup);

  const coreData = {
    group: coreGroup,
    mesh: octaMesh,
    ring: ringMesh,
    meshes: [octaMesh, ringMesh, coreGroup],
    respawnTimer: 0,
    collected: false,
    x: x,
    y: y,
    z: z,
    collect: () => {
      if (coreData.collected) return;
      coreData.collected = true;
      scene.remove(coreGroup);
      coreData.meshes.forEach(m => interactiveRegistry.unregister(m));
      eventBus.emit('item:collected', { type: 'power_core' });
      collectedCoresCount++;
      inventory.addResource('energyCells', 1);
      if (gameContext) {
        if (gameContext.restoreEnergy) gameContext.restoreEnergy(CONFIG.SURVIVAL.CORE_ENERGY_RESTORE);
        if (gameContext.restoreIntegrity) gameContext.restoreIntegrity(CONFIG.SURVIVAL.CORE_INTEGRITY_RESTORE);
      }
      updateCollectedCount(collectedCoresCount);
      createSparkBurst(coreGroup.position, 0x00f0ff, 25);
      showBanner(`🔋 Energy cell collected! (+1 cell / +${CONFIG.SURVIVAL.CORE_ENERGY_RESTORE}% energy / +${CONFIG.SURVIVAL.CORE_INTEGRITY_RESTORE}% HP)`, '⚡');
      coreData.respawnTimer = RESPAWN.powerCore;
    }
  };

  const coreUserData = {
    type: 'power_core',
    name: 'Energy Cell',
    prompt: '[E] COLLECT ENERGY CELL (+35%)',
    action: coreData.collect
  };

  octaMesh.userData = coreUserData;
  ringMesh.userData = coreUserData;
  coreGroup.userData = coreUserData;

  interactiveRegistry.register(octaMesh);
  interactiveRegistry.register(ringMesh);
  interactiveRegistry.register(coreGroup);
  powerCores.push(coreData);
  return coreData;
}

/**
 * 2. Bobinas de Fios de Cobre Caídos no Asfalto
 */
export function spawnFallenCopperWire(rawX, rawZ, amount = 2) {
  const valid = placeCollectible(rawX, rawZ, 0.6);
  const x = valid.x;
  const z = valid.z;
  const y = valid.y;
  const wireGroup = new THREE.Group();

  const copperMat = createCelMaterial(0xf59e0b);
  const wireGeo = new THREE.TorusGeometry(0.55, 0.12, 10, 20);
  const wireMesh1 = new THREE.Mesh(wireGeo, copperMat);
  wireMesh1.rotation.x = Math.PI / 2;
  wireMesh1.position.y = 0.18;
  wireMesh1.castShadow = true;
  wireGroup.add(wireMesh1);

  const wireMesh2 = new THREE.Mesh(wireGeo, copperMat);
  wireMesh2.rotation.x = Math.PI / 2.3;
  wireMesh2.rotation.y = 0.4;
  wireMesh2.position.set(0.15, 0.28, 0.1);
  wireMesh2.castShadow = true;
  wireGroup.add(wireMesh2);

  // Faísca / Luz emitida pelo cobre (esfera pulsante brilhante)
  const sparkGeo = new THREE.SphereGeometry(0.2, 10, 10);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd000 });
  const sparkMesh = new THREE.Mesh(sparkGeo, sparkMat);
  sparkMesh.position.set(0, 0.55, 0);
  wireGroup.add(sparkMesh);

  // Anel de pulso no asfalto
  const haloGeo = new THREE.RingGeometry(0.3, 0.9, 16);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.rotation.x = -Math.PI / 2;
  haloMesh.position.y = 0.04;
  wireGroup.add(haloMesh);

  wireGroup.position.set(x, y, z);
  scene.add(wireGroup);

  const wireData = {
    group: wireGroup,
    sparkMesh: sparkMesh,
    haloMesh: haloMesh,
    meshes: [wireMesh1, wireMesh2, sparkMesh, haloMesh, wireGroup],
    respawnTimer: 0,
    collected: false,
    x: x,
    y: y,
    z: z,
    collect: () => {
      if (wireData.collected) return;
      wireData.collected = true;
      scene.remove(wireGroup);
      wireData.meshes.forEach(m => interactiveRegistry.unregister(m));
      eventBus.emit('item:collected', { type: 'copper_wire' });
      inventory.addResource('copperWires', amount);
      createSparkBurst(wireGroup.position, 0xf59e0b, 20);
      showBanner(`🧵 +${amount} copper wires collected from the asphalt!`, '⚡');
      wireData.respawnTimer = RESPAWN.copperWire;
    }
  };

  const wireUserData = {
    type: 'copper_wire_drop',
    name: 'Fallen Copper Wire',
    prompt: `[E] COLLECT COPPER WIRES (+${amount} wires)`,
    action: wireData.collect
  };

  wireMesh1.userData = wireUserData;
  wireMesh2.userData = wireUserData;
  sparkMesh.userData = wireUserData;
  haloMesh.userData = wireUserData;
  wireGroup.userData = wireUserData;

  interactiveRegistry.register(wireMesh1);
  interactiveRegistry.register(wireMesh2);
  interactiveRegistry.register(sparkMesh);
  interactiveRegistry.register(haloMesh);
  interactiveRegistry.register(wireGroup);
  fallenCopperWires.push(wireData);
  return wireData;
}

/**
 * 3. Cristais de Clock de Quartzo no Solo
 */
export function spawnGroundClockCrystal(rawX, rawZ) {
  const valid = placeCollectible(rawX, rawZ, 0.6);
  const x = valid.x;
  const z = valid.z;
  const y = valid.y;
  const crystalGroup = new THREE.Group();

  const crystalGeo = new THREE.ConeGeometry(0.45, 1.3, 6);
  const crystalMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const cMesh1 = new THREE.Mesh(crystalGeo, crystalMat);
  cMesh1.position.y = 0.65;
  cMesh1.rotation.z = 0.15;
  crystalGroup.add(cMesh1);

  const cMesh2 = new THREE.Mesh(crystalGeo, crystalMat);
  cMesh2.position.set(0.25, 0.45, -0.1);
  cMesh2.rotation.z = -0.25;
  cMesh2.scale.set(0.7, 0.7, 0.7);
  crystalGroup.add(cMesh2);

  const haloGeo = new THREE.RingGeometry(0.2, 0.75, 16);
  const haloMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.rotation.x = -Math.PI / 2;
  haloMesh.position.y = 0.04;
  crystalGroup.add(haloMesh);

  crystalGroup.position.set(x, y, z);
  scene.add(crystalGroup);

  const crystalData = {
    group: crystalGroup,
    mesh: cMesh1,
    halo: haloMesh,
    meshes: [cMesh1, cMesh2, haloMesh, crystalGroup],
    respawnTimer: 0,
    collected: false,
    collect: () => {
      if (crystalData.collected) return;
      crystalData.collected = true;
      scene.remove(crystalGroup);
      crystalData.meshes.forEach(m => interactiveRegistry.unregister(m));
      eventBus.emit('item:collected', { type: 'clock_crystal' });
      inventory.addResource('clockCrystals', 1);
      createSparkBurst(crystalGroup.position, 0x00f0ff, 20);
      showBanner(`💎 Quartz clock crystal collected! (+1 rare part)`, '✨');
      crystalData.respawnTimer = RESPAWN.crystal;
    }
  };

  const crystalUserData = {
    type: 'clock_crystal_drop',
    name: 'Clock Crystal',
    prompt: '[E] COLLECT CLOCK CRYSTAL',
    action: crystalData.collect
  };

  cMesh1.userData = crystalUserData;
  cMesh2.userData = crystalUserData;
  haloMesh.userData = crystalUserData;
  crystalGroup.userData = crystalUserData;

  interactiveRegistry.register(cMesh1);
  interactiveRegistry.register(cMesh2);
  interactiveRegistry.register(haloMesh);
  interactiveRegistry.register(crystalGroup);
  groundCrystals.push(crystalData);
  return crystalData;
}

function spawnExclusivePickup(x, z, resourceKey) {
  const y = worldService.getHeight(x, z);
  const color = EXCLUSIVE_COLOR[resourceKey] || 0xffffff;
  const label = EXCLUSIVE_LABEL[resourceKey] || resourceKey;
  const group = new THREE.Group();
  const geo = new THREE.OctahedronGeometry(0.55, 0);
  const mat = new THREE.MeshBasicMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.9;
  group.add(mesh);
  group.position.set(x, y, z);
  scene.add(group);

  const data = {
    group,
    mesh,
    meshes: [mesh, group],
    collected: false,
    collect: () => {
      if (data.collected) return;
      data.collected = true;
      scene.remove(group);
      data.meshes.forEach((m) => interactiveRegistry.unregister(m));
      eventBus.emit('item:collected', { type: resourceKey });
      inventory.addResource(resourceKey, 1);
      createSparkBurst(group.position, color, 16);
      showBanner(`✦ ${label} collected in this biome.`, '✨');
    }
  };

  const userData = {
    type: 'biome_exclusive',
    name: label,
    prompt: `[E] COLLECT ${label.toUpperCase()}`,
    action: data.collect
  };
  mesh.userData = userData;
  group.userData = userData;
  interactiveRegistry.register(mesh);
  interactiveRegistry.register(group);
  exclusivePickups.push(data);
}

function spawnExclusiveBiomePickups() {
  for (let i = 0; i < BIOME_CENTERS.length; i++) {
    const c = BIOME_CENTERS[i];
    const key = exclusiveResource(c.id);
    if (!key) continue;
    let placed = 0;
    let attempts = 0;
    while (placed < 8 && attempts < 64) {
      attempts++;
      const x = c.x + (Math.random() - 0.5) * 70;
      const z = c.z + (Math.random() - 0.5) * 70;
      if (getBiomeAt(x, z) !== c.id) continue;
      spawnExclusivePickup(x, z, key);
      placed++;
    }
  }
}

/**
 * 4. Abrigos de Resistores e Árvores de Resistores
 */
export function createResistorShelter(x, z, rotY = 0) {
  const y = worldService.getHeight(x, z);
  const shelterGroup = new THREE.Group();

  const resBodyGeo = new THREE.CylinderGeometry(0.9, 0.9, 8.0, 16);
  const resBodyMat = createCelMaterial(0xd7ccc8);
  const resMesh = new THREE.Mesh(resBodyGeo, resBodyMat);
  resMesh.position.set(0, 2.5, 0);
  resMesh.rotation.z = Math.PI / 4;
  shelterGroup.add(resMesh);

  const bandColors = [0x5d4037, 0x111111, 0xd32f2f, 0xffd700];
  bandColors.forEach((col, idx) => {
    const bandGeo = new THREE.CylinderGeometry(0.92, 0.92, 0.5, 16);
    const bandMesh = new THREE.Mesh(bandGeo, createCelMaterial(col));
    bandMesh.position.set(-1.8 + idx * 1.2, 2.5 + (-1.8 + idx * 1.2) * -1, 0);
    bandMesh.rotation.z = Math.PI / 4;
    shelterGroup.add(bandMesh);
  });

  const tarpGeo = new THREE.BoxGeometry(5.0, 0.1, 4.0);
  const tarpMat = createCelMaterial(0x1976d2);
  const tarp = new THREE.Mesh(tarpGeo, tarpMat);
  tarp.position.set(1.5, 3.5, 0);
  tarp.rotation.z = -Math.PI / 6;
  shelterGroup.add(tarp);

  shelterGroup.position.set(x, y, z);
  shelterGroup.rotation.y = rotY;
  scene.add(shelterGroup);

  worldService.addCollider({
    type: 'box',
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(x, y + 2, z),
      new THREE.Vector3(5, 4, 5)
    )
  });
}

export function buildCollectiblesAndShelters(gameContext) {
  const EXCL = ['ROAD', 'SIDEWALK', 'SAFE_ZONE'];

  const corePositions = BiomeDistributor.samplePositions({ count: 12, minRadius: 15, maxRadius: 170, exclusionRadius: 1.0, ignoredCategories: EXCL });
  corePositions.forEach(p => spawnPowerCore(p.x, p.z, gameContext));

  const wirePositions = BiomeDistributor.samplePositions({ count: 45, minRadius: 8, maxRadius: 225, exclusionRadius: 0.8, ignoredCategories: EXCL });
  wirePositions.forEach(p => spawnFallenCopperWire(p.x, p.z, Math.floor(Math.random() * 2) + 2));

  const crystalPositions = BiomeDistributor.samplePositions({ count: 22, minRadius: 10, maxRadius: 210, exclusionRadius: 0.8, ignoredCategories: EXCL });
  crystalPositions.forEach(p => spawnGroundClockCrystal(p.x, p.z));

  // Abrigos de Resistores (FORA de escopo — mantidos literalmente)
  createResistorShelter(38, 38, 0.4);
  createResistorShelter(-38, 38, -0.6);
  createResistorShelter(-38, -55, 1.2);
  createResistorShelter(55, -38, -1.0);

  spawnExclusiveBiomePickups();
}

export function updateCollectibles(delta, time, playerPos) {
  // Animação de Células de Energia
  for (let i = powerCores.length - 1; i >= 0; i--) {
    const core = powerCores[i];
    if (!core.collected) {
      core.mesh.rotation.y += delta * 1.8;
      core.ring.rotation.z += delta * 1.2;
      core.mesh.position.y = 1.4 + Math.sin(time * 2.5 + i) * 0.2;
      core.ring.position.y = 1.4 + Math.sin(time * 2.5 + i) * 0.2;
    }
  }

  // Animação de faíscas nos fios caídos
  for (let i = 0; i < fallenCopperWires.length; i++) {
    const w = fallenCopperWires[i];
    if (!w.collected && w.sparkMesh) {
      w.sparkMesh.position.y = 0.35 + Math.sin(time * 4.0 + i) * 0.08;
      w.sparkMesh.rotation.y += delta * 3.0;
    }
  }

  // Animação dos cristais de clock no solo
  for (let i = 0; i < groundCrystals.length; i++) {
    const c = groundCrystals[i];
    if (!c.collected) {
      c.mesh.rotation.y += delta * 1.5;
      c.halo.rotation.z += delta * 0.8;
    }
  }

  for (let i = 0; i < exclusivePickups.length; i++) {
    const p = exclusivePickups[i];
    if (!p.collected) {
      p.mesh.rotation.y += delta * 1.6;
      p.mesh.position.y = 0.9 + Math.sin(time * 2.2 + i) * 0.12;
    }
  }

  // Respawn periódico (re-usa o mesmo group, sem recriar geometria)
  for (const list of [powerCores, fallenCopperWires, groundCrystals]) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item.collected) continue;
      item.respawnTimer -= delta;
      if (item.respawnTimer <= 0) {
        item.collected = false;
        item.respawnTimer = 0;
        scene.add(item.group);
        if (item.meshes) {
          for (const m of item.meshes) interactiveRegistry.register(m);
        }
      }
    }
  }
}
