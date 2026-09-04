/**
 * GroundScatter.js — Detritos e Scatter de Solo Orgânico (Pedras, Gravetos e Troncos Caídos)
 * Povoa o chão da selva amazônica com elementos naturais realistas a 60 FPS.
 */
import { scene } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { worldToChunk, chunkKey, getMapSize, countRingChunks, forEachRingChunk, CHUNK_SIZE } from '../chunkStore.js?v=20260903';
import { captureLods } from '../chunkVegetation.js?v=20260903';
import { BiomeDistributor } from '../vegetation/BiomeDistributor.js?v=20260821';
import { LODInstanced } from '../vegetation/VegetationLOD.js?v=20260828';
import { quality } from '../../config/quality.js?v=20260827';

export class GroundScatter {
  static _lodInstances = [];

  static build() {
    // 1. GEOMETRIAS DE DETRITOS DE SOLO
    // A. Pedregulho Grande (Boulder com Musgo 3.5m)
    const largeBoulderGeo = new THREE.DodecahedronGeometry(2.4, 1);
    const posAttr = largeBoulderGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      const vz = posAttr.getZ(i);
      const noise = 1.0 + Math.sin(vx * 3.0 + vy * 2.0) * 0.18 + Math.cos(vz * 3.0) * 0.12;
      posAttr.setXYZ(i, vx * noise, vy * 0.75 * noise, vz * noise);
    }
    largeBoulderGeo.computeVertexNormals();

    // B. Pedra Média (1.4m)
    const medRockGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const medPos = medRockGeo.attributes.position;
    for (let i = 0; i < medPos.count; i++) {
      const vx = medPos.getX(i);
      const vy = medPos.getY(i);
      const vz = medPos.getZ(i);
      medPos.setXYZ(i, vx * (1.0 + Math.sin(vy * 4.0) * 0.15), vy * 0.7, vz * 1.1);
    }
    medRockGeo.computeVertexNormals();

    // C. Seixo / Cascalho Pequeno (0.4m)
    const smallPebbleGeo = new THREE.DodecahedronGeometry(0.35, 0);

    // D. Tronco Caído no Solo (Log com Musgo 6.0m)
    const fallenLogGeo = new THREE.CylinderGeometry(0.35, 0.45, 5.5, 7);
    fallenLogGeo.rotateZ(Math.PI / 2);
    fallenLogGeo.translate(0, 0.25, 0);

    // E. Gravetos e Ramos Secos (Twigs 1.8m)
    const twigGroup = [];
    const mainTwig = new THREE.CylinderGeometry(0.05, 0.08, 2.0, 5);
    mainTwig.rotateZ(Math.PI / 2 + 0.2);
    const sideTwig = new THREE.CylinderGeometry(0.03, 0.05, 1.1, 4);
    sideTwig.rotateZ(Math.PI / 3);
    sideTwig.translate(0.4, 0.05, 0.2);

    // 2. CONTAGENS (ESCALADAS PELA QUALIDADE GRÁFICA)
    const NUM_BOULDERS = Math.max(1, Math.round(70 * quality.vegetationDensity));
    const NUM_MED_ROCKS = Math.max(1, Math.round(150 * quality.vegetationDensity));
    const NUM_PEBBLES = Math.max(1, Math.round(350 * quality.vegetationDensity));
    const NUM_LOGS = Math.max(1, Math.round(90 * quality.vegetationDensity));
    const NUM_TWIGS = Math.max(1, Math.round(220 * quality.vegetationDensity));

    const ringN = getMapSize() > 480 ? countRingChunks() : 0;
    const cap = (inner, perChunk) => inner + perChunk * ringN;

    const boulderLOD = new LODInstanced(largeBoulderGeo, null, TOON_MATERIALS.ROCK_MOUNTAIN, cap(NUM_BOULDERS, 2), 80, 180, { castShadow: true, receiveShadow: true });
    const medRockLOD = new LODInstanced(medRockGeo, null, TOON_MATERIALS.ROCK_DARK_CLIFF, cap(NUM_MED_ROCKS, 4), 80, 180, { castShadow: true, receiveShadow: true });
    const pebbleLOD = new LODInstanced(smallPebbleGeo, null, TOON_MATERIALS.GROUND_TRAILS, cap(NUM_PEBBLES, 6), 80, 180, { receiveShadow: true });
    const logLOD = new LODInstanced(fallenLogGeo, null, TOON_MATERIALS.BARK_TWISTED, cap(NUM_LOGS, 2), 80, 180, { castShadow: true, receiveShadow: true });
    const twigLOD = new LODInstanced(mainTwig, null, TOON_MATERIALS.BARK_BANYAN, cap(NUM_TWIGS, 4), 80, 180, { receiveShadow: true });

    GroundScatter._lodInstances.push(boulderLOD, medRockLOD, pebbleLOD, logLOD, twigLOD);

    // 3. POVOAMENTO DO CHÃO COM COLISÕES SÓLIDAS
    // Pedregulhos Grandes (Colisão física sólida de 2.2m)
    BiomeDistributor.populateZone({
      instMesh: boulderLOD.full,
      count: NUM_BOULDERS,
      minRadius: 25,
      maxRadius: 220,
      scaleRange: [0.9, 1.4],
      groundSink: 0.35,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        boulderLOD.add(dummy.matrix.clone(), x, z);
        worldService.addCollider({
          type: 'cylinder',
          center: { x, z },
          _chunkKey: chunkKey(worldToChunk(x, z).cx, worldToChunk(x, z).cz),
          radius: 2.0 * scale
        });
      }
    });

    // Pedras Médias (Scatter transitável)
    BiomeDistributor.populateZone({
      instMesh: medRockLOD.full,
      count: NUM_MED_ROCKS,
      minRadius: 20,
      maxRadius: 225,
      scaleRange: [0.8, 1.3],
      groundSink: 0.25,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        medRockLOD.add(dummy.matrix.clone(), x, z);
      }
    });

    // Seixos Pequenos
    BiomeDistributor.populateZone({
      instMesh: pebbleLOD.full,
      count: NUM_PEBBLES,
      minRadius: 18,
      maxRadius: 225,
      scaleRange: [0.7, 1.4],
      groundSink: 0.1,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        pebbleLOD.add(dummy.matrix.clone(), x, z);
      }
    });

    // Troncos Caídos (Scatter transitável)
    BiomeDistributor.populateZone({
      instMesh: logLOD.full,
      count: NUM_LOGS,
      minRadius: 22,
      maxRadius: 220,
      scaleRange: [0.9, 1.3],
      groundSink: 0.15,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        logLOD.add(dummy.matrix.clone(), x, z);
      }
    });

    // Gravetos Soltos
    BiomeDistributor.populateZone({
      instMesh: twigLOD.full,
      count: NUM_TWIGS,
      minRadius: 18,
      maxRadius: 220,
      scaleRange: [0.8, 1.3],
      groundSink: 0.05,
      onInstancePlaced: (idx, x, y, z, scale, dummy) => {
        twigLOD.add(dummy.matrix.clone(), x, z);
      }
    });

    if (getMapSize() > 480) {
      GroundScatter.populateRing(boulderLOD, 2, 2.0);
      GroundScatter.populateRing(medRockLOD, 4, 0);
      GroundScatter.populateRing(pebbleLOD, 6, 0);
      GroundScatter.populateRing(logLOD, 2, 0);
      GroundScatter.populateRing(twigLOD, 4, 0);
    }

    boulderLOD.addToScene(scene);
    medRockLOD.addToScene(scene);
    pebbleLOD.addToScene(scene);
    logLOD.addToScene(scene);
    twigLOD.addToScene(scene);

    // INICIALIZA OS BUCKETS DE LOD IMEDIATAMENTE (ANTES DO PRIMEIRO FRAME)
    GroundScatter._lodInstances.forEach(l => l.updateFromCamera(true));
  }

  static populateRing(lod, countPerChunk, colliderRadius) {
    const dummy = new THREE.Object3D();
    forEachRingChunk((cx, cz, o) => {
      const pts = BiomeDistributor.sampleInBounds({
        minX: o.startX + 4,
        maxX: o.startX + CHUNK_SIZE - 4,
        minZ: o.startZ + 4,
        maxZ: o.startZ + CHUNK_SIZE - 4,
        count: countPerChunk,
        exclusionRadius: 1.0
      });
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const y = worldService.getHeight(p.x, p.z);
        dummy.position.set(p.x, y, p.z);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        const s = 0.85 + Math.random() * 0.35;
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        lod.add(dummy.matrix.clone(), p.x, p.z);
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

  static bindToChunks() {
    captureLods(GroundScatter._lodInstances);
    GroundScatter._lodInstances = [];
  }

  static update() {
    /* LOD vivo é actualizado em VegetationManager.update -> updateLiveChunkLods */
  }
}
