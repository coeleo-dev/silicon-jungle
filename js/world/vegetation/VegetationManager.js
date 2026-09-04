/**
 * VegetationManager — Orquestrador do Ecossistema Botânico da Selva Amazônica (60 FPS)
 * Renderiza árvores volumétricas e orgânicas, sub-bosque exuberante e colisões físicas sólidas.
 */
import { scene, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { createSparkBurst } from '../../utils/particles.js?v=20260821';
import { showBanner } from '../../ui/hud.js?v=20260912';
import { inventory } from '../../entities/inventory.js?v=20260912';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { worldToChunk, chunkKey, getMapSize, countRingChunks, forEachRingChunk, CHUNK_SIZE } from '../chunkStore.js?v=20260903';
import { getBiomeAt } from '../biomeMap.js?v=20260904';
import { extraDensity } from '../biomeVisuals.js?v=20260904';
import { captureLods, updateLiveChunkLods } from '../chunkVegetation.js?v=20260903';
import { interactiveRegistry } from '../../core/InteractiveRegistry.js?v=20260821';
import { TreeFactory, createSimpleTrunkLOD, createSimpleCanopyLOD } from './TreeFactory.js?v=20260821';
import { UnderstoryFactory } from './UnderstoryFactory.js?v=20260821';
import { BiomeDistributor } from './BiomeDistributor.js?v=20260821';
import { LODInstanced } from './VegetationLOD.js?v=20260828';
import { quality } from '../../config/quality.js?v=20260827';
import { GroundScatter } from '../terrain/GroundScatter.js?v=20260821';

export const interactiveVines = [];
export const thermalMossClusters = [];

let fireflyMesh = null;
const fireflyCount = 180;
const fireflyPositions = [];

export class VegetationManager {
  static _lodInstances = [];

  static build(gameContext) {
    // 1. TEMPLATES BOTÂNICOS DAS 5 VARIANTES AMAZÔNICAS (COM GALHOS HIERÁRQUICOS E FOLHAS MULTI-ESCALA)
    const sumauma = TreeFactory.createSumaumaTree(28, 2.4);
    const palm = TreeFactory.createPalmTree(20);
    const banyan = TreeFactory.createBanyanTree(16, 1.4);
    const embauba = TreeFactory.createEmbaubaTree(13, 0.58);
    const cacaueiro = TreeFactory.createCacaueiroTree(6.0, 0.42);

    const bushGeo = UnderstoryFactory.createBushGeometry(4.2, 14);
    const fernGeo = UnderstoryFactory.createFernGeometry(2.8, 12);
    const plainsGrassGeo = UnderstoryFactory.createGrassClusterGeometry(1.8, 8);
    const shroomCapGeo = UnderstoryFactory.createMushroomCapGeometry();
    const flowerGeo = UnderstoryFactory.createFlowerGeometry();

    // 2. CONTAGEM EQUILIBRADA PARA 60 FPS (ESCALADA PELA QUALIDADE GRÁFICA)
    const NUM_SUMAUMAS = Math.max(1, Math.round(45 * quality.vegetationDensity));
    const NUM_PALMS = Math.max(1, Math.round(180 * quality.vegetationDensity));
    const NUM_BANYANS = Math.max(1, Math.round(130 * quality.vegetationDensity));
    const NUM_EMBAUBAS = Math.max(1, Math.round(150 * quality.vegetationDensity));
    const NUM_CACAUEIROS = Math.max(1, Math.round(200 * quality.vegetationDensity));
    const NUM_BUSHES = Math.max(1, Math.round(550 * quality.vegetationDensity));
    const NUM_FERNS = Math.max(1, Math.round(800 * quality.vegetationDensity));
    const NUM_PLAINS_GRASS = Math.max(1, Math.round(600 * quality.vegetationDensity));
    const NUM_SHROOMS = Math.max(1, Math.round(350 * quality.vegetationDensity));
    const NUM_FLOWERS = Math.max(1, Math.round(280 * quality.vegetationDensity));

    const ringN = getMapSize() > 480 ? countRingChunks() : 0;
    const cap = (inner, perChunk) => Math.ceil((inner + perChunk * ringN) * 1.4);

    // 3. LODINSTANCED COM MATERIAIS PBR TEXTURIZADOS (DETALHE TOTAL + LOD1 SIMPLIFICADO)
    const sumaumaTrunkLOD = new LODInstanced(sumauma.trunkGeometry, createSimpleTrunkLOD(sumauma.trunkGeometry), TOON_MATERIALS.BARK_BANYAN, cap(NUM_SUMAUMAS, 2), 80, 180, { castShadow: true, receiveShadow: true });
    const sumaumaCanopyLOD = new LODInstanced(sumauma.canopyGeometry, createSimpleCanopyLOD(sumauma.canopyGeometry), TOON_MATERIALS.FOLIAGE_DEEP_JUNGLE, cap(NUM_SUMAUMAS, 2), 80, 180, { castShadow: true });
    VegetationManager._lodInstances.push(sumaumaTrunkLOD, sumaumaCanopyLOD);

    const palmTrunkLOD = new LODInstanced(palm.trunkGeometry, createSimpleTrunkLOD(palm.trunkGeometry), TOON_MATERIALS.BARK_PALM, cap(NUM_PALMS, 3), 80, 180, { castShadow: true, receiveShadow: true });
    const palmFrondLOD = new LODInstanced(palm.canopyGeometry, createSimpleCanopyLOD(palm.canopyGeometry, 'palm'), TOON_MATERIALS.FOLIAGE_PALM, cap(NUM_PALMS, 3), 80, 180, { castShadow: true });
    VegetationManager._lodInstances.push(palmTrunkLOD, palmFrondLOD);

    const banyanTrunkLOD = new LODInstanced(banyan.trunkGeometry, createSimpleTrunkLOD(banyan.trunkGeometry), TOON_MATERIALS.BARK_BANYAN, cap(NUM_BANYANS, 2), 80, 180, { castShadow: true, receiveShadow: true });
    const banyanCanopyLOD = new LODInstanced(banyan.canopyGeometry, createSimpleCanopyLOD(banyan.canopyGeometry), TOON_MATERIALS.FOLIAGE_DEEP_JUNGLE, cap(NUM_BANYANS, 2), 80, 180, { castShadow: true });
    VegetationManager._lodInstances.push(banyanTrunkLOD, banyanCanopyLOD);

    const embaubaTrunkLOD = new LODInstanced(embauba.trunkGeometry, createSimpleTrunkLOD(embauba.trunkGeometry), TOON_MATERIALS.BARK_PALM, cap(NUM_EMBAUBAS, 3), 80, 180, { castShadow: true, receiveShadow: true });
    const embaubaCanopyLOD = new LODInstanced(embauba.canopyGeometry, createSimpleCanopyLOD(embauba.canopyGeometry), TOON_MATERIALS.FOLIAGE_OLIVE, cap(NUM_EMBAUBAS, 3), 80, 180, { castShadow: true });
    VegetationManager._lodInstances.push(embaubaTrunkLOD, embaubaCanopyLOD);

    const cacaueiroTrunkLOD = new LODInstanced(cacaueiro.trunkGeometry, createSimpleTrunkLOD(cacaueiro.trunkGeometry), TOON_MATERIALS.BARK_TWISTED, cap(NUM_CACAUEIROS, 3), 80, 180, { castShadow: true, receiveShadow: true });
    const cacaueiroCanopyLOD = new LODInstanced(cacaueiro.canopyGeometry, createSimpleCanopyLOD(cacaueiro.canopyGeometry), TOON_MATERIALS.FOLIAGE_FERN_DENSE, cap(NUM_CACAUEIROS, 3), 80, 180, { castShadow: true });
    VegetationManager._lodInstances.push(cacaueiroTrunkLOD, cacaueiroCanopyLOD);

    const bushLOD = new LODInstanced(bushGeo, null, TOON_MATERIALS.FOLIAGE_FERN_DENSE, cap(NUM_BUSHES, 6), 80, 180, { castShadow: true, isBush: true });
    const fernLOD = new LODInstanced(fernGeo, null, TOON_MATERIALS.FOLIAGE_OLIVE, cap(NUM_FERNS, 8), 80, 180, {});
    const plainsGrassLOD = new LODInstanced(plainsGrassGeo, null, TOON_MATERIALS.FOLIAGE_TEAL, cap(NUM_PLAINS_GRASS, 8), 80, 180, {});

    const shroomCapMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const shroomLOD = new LODInstanced(shroomCapGeo, null, shroomCapMat, cap(NUM_SHROOMS, 3), 80, 180, {});

    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const flowerLOD = new LODInstanced(flowerGeo, null, flowerMat, cap(NUM_FLOWERS, 4), 80, 180, {});

    VegetationManager._lodInstances.push(bushLOD, fernLOD, plainsGrassLOD, shroomLOD, flowerLOD);

    // 4. DISTRIBUIÇÃO COM BASES PLANTADAS NO SOLO E COLISORES SÓLIDOS
    // Sumaúmas (Raio de colisão 2.4m, exclusion 4.5m além de prédios e ruas)
    BiomeDistributor.populateZone({
      instMesh: sumaumaTrunkLOD.full,
      count: NUM_SUMAUMAS,
      minRadius: 26,
      maxRadius: 215,
      scaleRange: [0.95, 1.25],
      groundSink: 0.45,
      exclusionRadius: 4.5,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        const m = dummy.matrix.clone();
        sumaumaTrunkLOD.add(m, x, z);
        sumaumaCanopyLOD.add(m, x, z);
        sumaumaCanopyLOD.full.setMatrixAt(idx, dummy.matrix);
        worldService.addCollider({
          type: 'cylinder',
          center: { x, z },
          _chunkKey: chunkKey(worldToChunk(x, z).cx, worldToChunk(x, z).cz),
          radius: 2.4 * scale
        });
      }
    });
    sumaumaCanopyLOD.full.count = sumaumaTrunkLOD.full.count;
    sumaumaCanopyLOD.full.instanceMatrix.needsUpdate = true;

    // Palmeiras Tropicais (Raio de colisão 0.85m, exclusion 2.2m)
    BiomeDistributor.populateZone({
      instMesh: palmTrunkLOD.full,
      count: NUM_PALMS,
      minRadius: 24,
      maxRadius: 220,
      scaleRange: [0.85, 1.25],
      groundSink: 0.35,
      exclusionRadius: 2.2,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        const m = dummy.matrix.clone();
        palmTrunkLOD.add(m, x, z);
        palmFrondLOD.add(m, x, z);
        palmFrondLOD.full.setMatrixAt(idx, dummy.matrix);
        worldService.addCollider({
          type: 'cylinder',
          center: { x, z },
          _chunkKey: chunkKey(worldToChunk(x, z).cx, worldToChunk(x, z).cz),
          radius: 0.85 * scale
        });
      }
    });
    palmFrondLOD.full.count = palmTrunkLOD.full.count;
    palmFrondLOD.full.instanceMatrix.needsUpdate = true;

    // Banyan / Figueiras Estranguladoras (Raio de colisão 1.45m, exclusion 3.5m)
    BiomeDistributor.populateZone({
      instMesh: banyanTrunkLOD.full,
      count: NUM_BANYANS,
      minRadius: 26,
      maxRadius: 210,
      scaleRange: [0.85, 1.2],
      groundSink: 0.4,
      exclusionRadius: 3.5,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        const m = dummy.matrix.clone();
        banyanTrunkLOD.add(m, x, z);
        banyanCanopyLOD.add(m, x, z);
        banyanCanopyLOD.full.setMatrixAt(idx, dummy.matrix);
        worldService.addCollider({
          type: 'cylinder',
          center: { x, z },
          _chunkKey: chunkKey(worldToChunk(x, z).cx, worldToChunk(x, z).cz),
          radius: 1.45 * scale
        });
      }
    });
    banyanCanopyLOD.full.count = banyanTrunkLOD.full.count;
    banyanCanopyLOD.full.instanceMatrix.needsUpdate = true;

    // Embaúbas (Raio de colisão 0.6m, exclusion 2.0m)
    BiomeDistributor.populateZone({
      instMesh: embaubaTrunkLOD.full,
      count: NUM_EMBAUBAS,
      minRadius: 24,
      maxRadius: 215,
      scaleRange: [0.85, 1.15],
      groundSink: 0.35,
      exclusionRadius: 2.0,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        const m = dummy.matrix.clone();
        embaubaTrunkLOD.add(m, x, z);
        embaubaCanopyLOD.add(m, x, z);
        embaubaCanopyLOD.full.setMatrixAt(idx, dummy.matrix);
        worldService.addCollider({
          type: 'cylinder',
          center: { x, z },
          _chunkKey: chunkKey(worldToChunk(x, z).cx, worldToChunk(x, z).cz),
          radius: 0.6 * scale
        });
      }
    });
    embaubaCanopyLOD.full.count = embaubaTrunkLOD.full.count;
    embaubaCanopyLOD.full.instanceMatrix.needsUpdate = true;

    // Cacaueiros (Raio de colisão 0.45m, exclusion 1.8m)
    BiomeDistributor.populateZone({
      instMesh: cacaueiroTrunkLOD.full,
      count: NUM_CACAUEIROS,
      minRadius: 22,
      maxRadius: 220,
      scaleRange: [0.85, 1.25],
      groundSink: 0.3,
      exclusionRadius: 1.8,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        const m = dummy.matrix.clone();
        cacaueiroTrunkLOD.add(m, x, z);
        cacaueiroCanopyLOD.add(m, x, z);
        cacaueiroCanopyLOD.full.setMatrixAt(idx, dummy.matrix);
        worldService.addCollider({
          type: 'cylinder',
          center: { x, z },
          _chunkKey: chunkKey(worldToChunk(x, z).cx, worldToChunk(x, z).cz),
          radius: 0.45 * scale
        });
      }
    });
    cacaueiroCanopyLOD.full.count = cacaueiroTrunkLOD.full.count;
    cacaueiroCanopyLOD.full.instanceMatrix.needsUpdate = true;

    // Sub-bosque e Grama (Plantados suavemente, evitando interiores de prédios e pistas)
    BiomeDistributor.populateZone({
      instMesh: bushLOD.full,
      count: NUM_BUSHES,
      minRadius: 14,
      maxRadius: 225,
      scaleRange: [0.75, 1.25],
      groundSink: 0.2,
      exclusionRadius: 1.2,
      ignoreSidewalkBeyond: 40,
      species: 'bush',
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        bushLOD.add(dummy.matrix.clone(), x, z);
      }
    });
    BiomeDistributor.populateZone({
      instMesh: fernLOD.full,
      count: NUM_FERNS,
      minRadius: 14,
      maxRadius: 225,
      scaleRange: [0.8, 1.3],
      groundSink: 0.15,
      exclusionRadius: 1.0,
      ignoreSidewalkBeyond: 40,
      species: 'fern',
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        fernLOD.add(dummy.matrix.clone(), x, z);
      }
    });
    BiomeDistributor.populateZone({
      instMesh: plainsGrassLOD.full,
      count: NUM_PLAINS_GRASS,
      minRadius: 12,
      maxRadius: 220,
      scaleRange: [0.9, 1.4],
      isPlainsOnly: true,
      groundSink: 0.1,
      exclusionRadius: 0.8,
      ignoreSidewalkBeyond: 40,
      species: 'plains_grass',
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        plainsGrassLOD.add(dummy.matrix.clone(), x, z);
      }
    });
    BiomeDistributor.populateZone({
      instMesh: shroomLOD.full,
      count: NUM_SHROOMS,
      minRadius: 30,
      maxRadius: 215,
      scaleRange: [0.7, 1.2],
      groundSink: 0.1,
      exclusionRadius: 0.8,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        shroomLOD.add(dummy.matrix.clone(), x, z);
      }
    });
    BiomeDistributor.populateZone({
      instMesh: flowerLOD.full,
      count: NUM_FLOWERS,
      minRadius: 14,
      maxRadius: 210,
      scaleRange: [0.8, 1.2],
      groundSink: 0.1,
      exclusionRadius: 0.8,
      ignoreSidewalkBeyond: 40,
      species: 'flower',
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        flowerLOD.add(dummy.matrix.clone(), x, z);
      }
    });

    VegetationManager.densifyBiome(bushLOD, 'bush', NUM_BUSHES);
    VegetationManager.densifyBiome(fernLOD, 'fern', NUM_FERNS);
    VegetationManager.densifyBiome(plainsGrassLOD, 'plains_grass', NUM_PLAINS_GRASS);
    VegetationManager.densifyBiome(flowerLOD, 'flower', NUM_FLOWERS);

    if (getMapSize() > 480) {
      VegetationManager.populateRingPaired(sumaumaTrunkLOD, sumaumaCanopyLOD, 2, 2.4);
      VegetationManager.populateRingPaired(palmTrunkLOD, palmFrondLOD, 3, 0.85);
      VegetationManager.populateRingPaired(banyanTrunkLOD, banyanCanopyLOD, 2, 1.45);
      VegetationManager.populateRingPaired(embaubaTrunkLOD, embaubaCanopyLOD, 3, 0.6);
      VegetationManager.populateRingPaired(cacaueiroTrunkLOD, cacaueiroCanopyLOD, 3, 0.45);
      VegetationManager.populateRing(bushLOD, 6);
      VegetationManager.populateRing(fernLOD, 8);
      VegetationManager.populateRing(plainsGrassLOD, 8);
      VegetationManager.populateRing(shroomLOD, 3);
      VegetationManager.populateRing(flowerLOD, 4);
    }

    sumaumaTrunkLOD.addToScene(scene);
    sumaumaCanopyLOD.addToScene(scene);
    palmTrunkLOD.addToScene(scene);
    palmFrondLOD.addToScene(scene);
    banyanTrunkLOD.addToScene(scene);
    banyanCanopyLOD.addToScene(scene);
    embaubaTrunkLOD.addToScene(scene);
    embaubaCanopyLOD.addToScene(scene);
    cacaueiroTrunkLOD.addToScene(scene);
    cacaueiroCanopyLOD.addToScene(scene);
    bushLOD.addToScene(scene);
    fernLOD.addToScene(scene);
    plainsGrassLOD.addToScene(scene);
    shroomLOD.addToScene(scene);
    flowerLOD.addToScene(scene);

    // 5. CIPÓS CORTÁVEIS, MUSGOS TÉRMICOS E BIO-VAGA-LUMES
    this.createInteractiveLianas();
    this.createThermalMossClusters();
    this.createFireflies();

    // 6. INICIALIZA OS BUCKETS DE LOD IMEDIATAMENTE (ANTES DO PRIMEIRO FRAME)
    VegetationManager._lodInstances.forEach(l => l.updateFromCamera(true));
  }

  static densifyBiome(lod, species, baseCount) {
    const extra = extraDensity('circuit_plain', species);
    if (extra <= 0) return;
    const dummy = new THREE.Object3D();
    const count = Math.round(baseCount * extra);
    const pts = BiomeDistributor.sampleInBounds({
      minX: -110,
      maxX: 110,
      minZ: -110,
      maxZ: 110,
      count: count * 2,
      exclusionRadius: 0.9
    });
    let added = 0;
    for (let i = 0; i < pts.length && added < count; i++) {
      const p = pts[i];
      if (getBiomeAt(p.x, p.z) !== 'circuit_plain') continue;
      const y = worldService.getHeight(p.x, p.z);
      dummy.position.set(p.x, y, p.z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      const s = 0.8 + Math.random() * 0.4;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      lod.add(dummy.matrix.clone(), p.x, p.z);
      added++;
    }
  }

  static populateRing(lod, countPerChunk) {
    VegetationManager.populateRingPaired(lod, null, countPerChunk, 0);
  }

  static populateRingPaired(trunkLod, canopyLod, countPerChunk, colliderRadius) {
    const dummy = new THREE.Object3D();
    forEachRingChunk((cx, cz, o) => {
      const pts = BiomeDistributor.sampleInBounds({
        minX: o.startX + 4,
        maxX: o.startX + CHUNK_SIZE - 4,
        minZ: o.startZ + 4,
        maxZ: o.startZ + CHUNK_SIZE - 4,
        count: countPerChunk,
        exclusionRadius: 1.2
      });
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const y = worldService.getHeight(p.x, p.z);
        dummy.position.set(p.x, y, p.z);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        const s = 0.85 + Math.random() * 0.35;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        const m = dummy.matrix.clone();
        trunkLod.add(m, p.x, p.z);
        if (canopyLod) canopyLod.add(m, p.x, p.z);
        if (colliderRadius > 0) {
          worldService.addCollider({
            type: 'cylinder',
            center: { x: p.x, z: p.z },
            _chunkKey: chunkKey(cx, cz),
            radius: colliderRadius * s
          });
        }
      }
    });
  }

  static createInteractiveLianas() {
    const lianaMat = createCelMaterial(0x15803d);
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + (Math.random() * 0.2);
      const dist = 35 + Math.random() * 165;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = worldService.getHeight(x, z);

      const vineGeo = new THREE.CylinderGeometry(0.08, 0.08, 6.5, 6);
      const vineMesh = new THREE.Mesh(vineGeo, lianaMat);
      vineMesh.position.set(x, y + 3.25, z);
      vineMesh.castShadow = true;
      scene.add(vineMesh);

      const vineData = {
        mesh: vineMesh,
        isCut: false,
        cut: () => {
          if (vineData.isCut) return;
          vineData.isCut = true;
          scene.remove(vineMesh);
          audioService.play('playVineCut') || audioService.knifeSlash();
          createSparkBurst(vineMesh.position, 0x15803d, 18);
          inventory.addResource('copperWires', 2);
          showBanner('🌿 Vine cut! (+2 copper wires)', '🌱');
        }
      };

      const vineUserData = {
        type: 'jumper_vine',
        name: 'Jumper Vine (Copper Wires)',
        prompt: '[ATTACK WITH KNIFE] CUT VINE',
        action: vineData.cut
      };

      vineMesh.userData = vineUserData;
      interactiveRegistry.register(vineMesh);
      interactiveVines.push(vineData);
    }
  }

  static createThermalMossClusters() {
    const mossMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + (Math.random() * 0.3);
      const dist = 40 + Math.random() * 160;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = worldService.getHeight(x, z);

      const mossGeo = new THREE.DodecahedronGeometry(0.7, 0);
      const mossMesh = new THREE.Mesh(mossGeo, mossMat);
      mossMesh.position.set(x, y + 0.45, z);
      mossMesh.scale.set(1.4, 0.6, 1.4);
      scene.add(mossMesh);

      const mossData = {
        mesh: mossMesh,
        isHarvested: false,
        harvest: () => {
          if (mossData.isHarvested) return;
          mossData.isHarvested = true;
          scene.remove(mossMesh);
          audioService.collect();
          createSparkBurst(mossMesh.position, 0x22c55e, 22);
          inventory.addResource('thermalPastes', 1);
          showBanner('🧪 Thermal moss harvested! (+1 thermal paste)', '💚');
        }
      };

      const mossUserData = {
        type: 'thermal_moss',
        name: 'Thermal Moss Cluster',
        prompt: '[E] HARVEST THERMAL PASTE (+1 HEAL ITEM)',
        action: mossData.harvest
      };

      mossMesh.userData = mossUserData;
      interactiveRegistry.register(mossMesh);
      thermalMossClusters.push(mossData);
    }
  }

  static createFireflies() {
    const fireflyGeo = new THREE.BufferGeometry();
    const posArray = new Float32Array(fireflyCount * 3);

    for (let i = 0; i < fireflyCount; i++) {
      const x = (Math.random() - 0.5) * 360;
      const z = (Math.random() - 0.5) * 360;
      const y = worldService.getHeight(x, z) + 1.5 + Math.random() * 8.0;

      posArray[i * 3] = x;
      posArray[i * 3 + 1] = y;
      posArray[i * 3 + 2] = z;

      fireflyPositions.push({
        baseX: x,
        baseY: y,
        baseZ: z,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 0.8
      });
    }

    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0x00ffcc,
      size: 0.65,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    fireflyMesh = new THREE.Points(fireflyGeo, fireflyMat);
    scene.add(fireflyMesh);
  }

  static bindToChunks() {
    captureLods(VegetationManager._lodInstances);
    VegetationManager._lodInstances = [];
  }

  static update(delta, time) {
    if (fireflyMesh) {
      fireflyMesh.rotation.y += delta * 0.03;
      fireflyMesh.position.y = Math.sin(time * 0.6) * 0.4;
    }
    updateLiveChunkLods();
    GroundScatter.update();
  }
}
