/**
 * loot.js — Spawning e Coleta de Itens Raros (Cristais de Clock)
 * Integrado ao WorldService e AudioService.
 */
import { scene } from '../core/scene.js?v=20260821';
import { audioService } from '../core/AudioService.js?v=20260821';
import { createSparkBurst } from '../utils/particles.js?v=20260821';
import { showBanner } from '../ui/hud.js?v=20260912';
import { inventory } from '../entities/inventory.js?v=20260912';
import { interactiveRegistry } from '../core/InteractiveRegistry.js?v=20260821';
import { resolveEntitySpawn } from './spawnResolver.js?v=20260821';
import { eventBus } from '../core/EventBus.js?v=20260821';
import { TOON_MATERIALS } from '../core/textures.js?v=20260821';
import { allBuildingSpecs } from './structures/CityLayoutManager.js?v=20260912';
import { spatialExclusionService } from '../core/SpatialExclusionService.js?v=20260821';

export const lootChests = [];

/**
 * Spawna um Baú de Loot (Suprimentos de Economia) no solo, junto a prédios.
 */
export function spawnLootChest(x, z, id = '') {
  const spawn = resolveEntitySpawn(x, z, 1.0, {
    ignoreCategories: ['ROAD', 'SIDEWALK'],
    maxDistance: 20
  });
  x = spawn.x;
  z = spawn.z;
  const y = spawn.y;
  const chestGroup = new THREE.Group();

  // Corpo do baú
  const corpoGeo = new THREE.BoxGeometry(1.4, 1.0, 0.9);
  const corpoMat = TOON_MATERIALS.PAINTED_METAL;
  const corpoMesh = new THREE.Mesh(corpoGeo, corpoMat);
  corpoMesh.position.y = 0.5;
  corpoMesh.castShadow = true;
  corpoMesh.receiveShadow = true;
  chestGroup.add(corpoMesh);

  // Tampa do baú
  const tampaGeo = new THREE.BoxGeometry(1.5, 0.25, 1.0);
  const tampaMat = TOON_MATERIALS.AMBER_PANEL_METAL;
  const tampaMesh = new THREE.Mesh(tampaGeo, tampaMat);
  tampaMesh.position.y = 0.62;
  tampaMesh.castShadow = true;
  tampaMesh.receiveShadow = true;
  chestGroup.add(tampaMesh);

  // Luz emissiva âmbar (painel de destaque na frente do baú)
  const luzGeo = new THREE.BoxGeometry(0.4, 0.12, 0.05);
  const luzMat = new THREE.MeshBasicMaterial({ color: 0xffb700 });
  const luzMesh = new THREE.Mesh(luzGeo, luzMat);
  luzMesh.position.set(0, 0.45, 0.46);
  chestGroup.add(luzMesh);

  chestGroup.position.set(x, y, z);
  scene.add(chestGroup);
  spatialExclusionService.registerProp(id || `chest_${x}_${z}`, x, z, 1.2, 'PROP', 1.3);

  const chestData = {
    id: id,
    group: chestGroup,
    corpoMesh: corpoMesh,
    tampaMesh: tampaMesh,
    luzMesh: luzMesh,
    x: x,
    y: y,
    z: z,
    opened: false,
    open: () => {
      if (chestData.opened) return;
      chestData.opened = true;
      scene.remove(chestGroup);
      interactiveRegistry.unregister(chestGroup);
      interactiveRegistry.unregister(corpoMesh);
      interactiveRegistry.unregister(tampaMesh);
      interactiveRegistry.unregister(luzMesh);
      // Rolada de 1-3 itens ponderados
      const roll = 1 + Math.floor(Math.random() * 3); // 1..3
      const pool = [
        { resource: 'energyCells', weight: 3 },
        { resource: 'copperWires', weight: 3 },
        { resource: 'thermalPastes', weight: 2 },
        { resource: 'clockCrystals', weight: 1 }
      ];
      const granted = [];
      for (let i = 0; i < roll; i++) {
        const total = pool.reduce((s, p) => s + p.weight, 0);
        let r = Math.random() * total;
        let picked = pool[0];
        for (const p of pool) {
          r -= p.weight;
          if (r <= 0) { picked = p; break; }
        }
        inventory.addResource(picked.resource, 1);
        granted.push(picked.resource);
      }
      eventBus.emit('item:collected', { type: 'loot_chest' });
      audioService.collect();
      createSparkBurst(chestGroup.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xffb700, 25);
      const label = granted.map(r => r).join(', ');
      showBanner(`📦 Chest opened! +${granted.length} item(s): ${label}`, '📦');
    }
  };

  const chestUserData = {
    type: 'loot_chest',
    name: 'Supply Chest',
    prompt: '[E] OPEN SUPPLY CHEST',
    action: chestData.open
  };

  chestGroup.userData = chestUserData;
  corpoMesh.userData = chestUserData;
  tampaMesh.userData = chestUserData;
  luzMesh.userData = chestUserData;

  interactiveRegistry.register(chestGroup);
  interactiveRegistry.register(corpoMesh);
  interactiveRegistry.register(tampaMesh);
  interactiveRegistry.register(luzMesh);

  lootChests.push(chestData);
  return chestData;
}

/**
 * Posiciona ~6 baús de loot no solo, adjacentes a prédios e fora de ruas/calçadas.
 */
export function initLootChests() {
  // selecionar ~6 prédios (tipos comuns + variedade), ex. um a cada N specs
  const candidates = allBuildingSpecs.filter(s => !s.r); // evita silo (sem w/d claros)
  const step = Math.max(1, Math.floor(candidates.length / 6));
  let count = 0;
  for (let i = 0; i < candidates.length && count < 6; i += step) {
    const spec = candidates[i];
    const bWidth = spec.w || (spec.r ? spec.r * 2 : (spec.s || 20));
    // posição no SOLO, adjacente ao prédio (afastada da fachada)
    const cx = spec.x + bWidth / 2 + 2.5;
    const cz = spec.z;
    spawnLootChest(cx, cz, `chest_${spec.id}`);
    count++;
  }
}

export function initLootWorld() {
  initLootChests();
}

export function updateLoot(delta, time, playerPos) {
  // Animação leve dos baús não abertos (pulso da luz emissiva + leve bob)
  for (let i = 0; i < lootChests.length; i++) {
    const chest = lootChests[i];
    if (!chest.opened) {
      const pulse = 0.75 + Math.sin(time * 4.0 + i) * 0.25;
      chest.luzMesh.material.opacity = pulse;
      chest.luzMesh.material.transparent = true;
      chest.luzMesh.scale.setScalar(0.8 + Math.sin(time * 4.0 + i) * 0.2);
      chest.group.position.y = chest.y + Math.sin(time * 2.0 + i) * 0.05;
    }
  }
}
