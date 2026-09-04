/**
 * terrain.js — Motor de Relevo Orgânico Contínuo e Terreno PBR da Selva de Silício
 * Gera terreno natural e suave sem costuras retas, com elevações, vales e colinas orgânicas.
 */
import { scene, createCelMaterial } from '../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../core/textures.js?v=20260821';
import { addCollider } from '../utils/collision.js?v=20260912';
import { classifyTerrainChunk, materialIdForKind } from './terrainClassify.js?v=20260824';
import { getBiomeAt } from './biomeMap.js?v=20260904';
import { terrainKindForBiome } from './biomeVisuals.js?v=20260904';
import {
  CHUNK_SIZE,
  getMapSize,
  setChunksPerAxis,
  chunkWorldOrigin,
  loadChunk,
  setTerrainLoader,
  setTerrainUnloader
} from './chunkStore.js?v=20260903';

export const terrainChunks = [];

/**
 * Motor Analítico de Altura Contínua e Relevo Orgânico O(1)
 * Retorna a cota Y exata em qualquer coordenada (X, Z) do mundo
 */
export function getTerrainHeight(x, z) {
  const distFromCenter = Math.hypot(x, z);

  // 1. ZONA CENTRAL: Avenidas Urbanas Integradas ao Relevo
  const isAvenueNS = Math.abs(x) < 7.0;
  const isAvenueEW = Math.abs(z) < 7.0;

  // Ruído orgânico de base (FBM natural com colinas, declives e ondulações)
  const fbm = Math.sin(x * 0.035 + z * 0.028) * 2.2 
            + Math.sin(x * 0.08 - z * 0.07) * 1.1 
            + Math.cos(x * 0.16 + z * 0.14) * 0.5
            + Math.sin(x * 0.32 - z * 0.28) * 0.2;

  // 2. Planalto da Cidadela CPU (Nordeste)
  let plateau = 0;
  if (x > 15 && x < 125 && z < -15 && z > -125) {
    const distToCenter = Math.hypot(x - 70, z - (-70));
    const blend = Math.max(0, 1.0 - distToCenter / 65.0);
    plateau = Math.pow(blend, 1.5) * 6.5;
  }

  // 3. Depressão do Cânion DIMM (Sudeste)
  let canyon = 0;
  if (x > 15 && x < 125 && z > 15 && z < 125) {
    const distToCenter = Math.hypot(x - 70, z - 70);
    const blend = Math.max(0, 1.0 - distToCenter / 60.0);
    canyon = -Math.pow(blend, 1.4) * 3.5;
  }

  // 4. Bacia dos Capacitores (Sudoeste)
  let swamp = 0;
  if (x < -15 && x > -125 && z > 15 && z < 125) {
    const distToCenter = Math.hypot(x - (-70), z - 70);
    const blend = Math.max(0, 1.0 - distToCenter / 60.0);
    swamp = -Math.pow(blend, 1.5) * 2.6 + Math.sin(x * 0.25 + z * 0.2) * 0.4;
  }

  // 5. Complexo I/O (Noroeste)
  let ioTerrace = 0;
  if (x < -15 && x > -125 && z < -15 && z > -125) {
    const distToCenter = Math.hypot(x - (-70), z - (-70));
    const blend = Math.max(0, 1.0 - distToCenter / 60.0);
    ioTerrace = Math.pow(blend, 1.6) * 2.8;
  }

  // 6. Cordilheiras Periféricas (Montanhas de Borda Externa > 145m)
  let mountains = 0;
  if (distFromCenter > 145) {
    const overflow = distFromCenter - 145;
    const ridgeNoise = Math.sin(x * 0.06) * Math.cos(z * 0.06) * 5.0 + Math.sin(x * 0.12 + z * 0.12) * 2.5;
    mountains = Math.min(28.0, Math.pow(overflow / 16.0, 1.7) * 3.8 + ridgeNoise);
  }

  // Relevo combinado orgânico
  let height = fbm + plateau + canyon + swamp + ioTerrace + mountains;

  // Leve depressão suave nas avenidas para assentar o asfalto sem corte reto
  if (distFromCenter < 140 && (isAvenueNS || isAvenueEW)) {
    const avenueFade = Math.max(0, 1.0 - (isAvenueNS ? Math.abs(x) / 7.0 : Math.abs(z) / 7.0));
    height -= avenueFade * 0.35;
  }

  return height;
}

/**
 * Calcula o vetor Normal analítico da superfície na coordenada (X, Z)
 */
export function getTerrainNormal(x, z) {
  const eps = 0.35;
  const hL = getTerrainHeight(x - eps, z);
  const hR = getTerrainHeight(x + eps, z);
  const hD = getTerrainHeight(x, z - eps);
  const hU = getTerrainHeight(x, z + eps);

  const normal = new THREE.Vector3(hL - hR, 2.0 * eps, hD - hU);
  return normal.normalize();
}

/**
 * Constrói o Terreno 3D Expandido (600×600 m) em Grade de 10×10 Chunks com PBR Contínuo
 */

export function disposeTerrainChunk(record) {
  if (!record?.mesh) return;
  scene.remove(record.mesh);
  if (record.mesh.geometry) record.mesh.geometry.dispose();
  const i = terrainChunks.indexOf(record);
  if (i >= 0) terrainChunks.splice(i, 1);
}

export function createTerrainChunk(cx, cz) {
  const mapSize = getMapSize();
  const chunkSize = CHUNK_SIZE;
  const segs = 22;
  const { startX, startZ, centerX, centerZ } = chunkWorldOrigin(cx, cz);

  const chunkGeo = new THREE.PlaneGeometry(chunkSize, chunkSize, segs, segs);
  chunkGeo.rotateX(-Math.PI / 2);

  const posAttr = chunkGeo.attributes.position;
  let minH = 999;
  let maxH = -999;

  for (let i = 0; i < posAttr.count; i++) {
    const vx = centerX + posAttr.getX(i);
    const vz = centerZ + posAttr.getZ(i);
    const vy = getTerrainHeight(vx, vz);
    posAttr.setY(i, vy);
    if (vy < minH) minH = vy;
    if (vy > maxH) maxH = vy;
  }

  chunkGeo.computeVertexNormals();

  const dist = Math.hypot(centerX, centerZ);
  const biomeKind = terrainKindForBiome(getBiomeAt(centerX, centerZ));
  const kind = biomeKind || classifyTerrainChunk({ startX, startZ, chunkSize, dist, maxH });
  const mat = TOON_MATERIALS[materialIdForKind(kind)];

  const chunkMesh = new THREE.Mesh(chunkGeo, mat);
  chunkMesh.position.set(centerX, 0, centerZ);
  chunkMesh.receiveShadow = true;
  chunkMesh.castShadow = (maxH > 8);
  scene.add(chunkMesh);

  const record = {
    cx,
    cz,
    mesh: chunkMesh,
    minH,
    maxH,
    centerX,
    centerZ,
    box: new THREE.Box3().setFromObject(chunkMesh)
  };
  terrainChunks.push(record);
  return record;
}

function addBoundaryColliders() {
  const mapHalf = getMapSize() / 2;
  addCollider({ type: 'box', box: new THREE.Box3(new THREE.Vector3(-mapHalf - 5, -20, -mapHalf), new THREE.Vector3(-mapHalf + 2, 40, mapHalf)) });
  addCollider({ type: 'box', box: new THREE.Box3(new THREE.Vector3(mapHalf - 2, -20, -mapHalf), new THREE.Vector3(mapHalf + 5, 40, mapHalf)) });
  addCollider({ type: 'box', box: new THREE.Box3(new THREE.Vector3(-mapHalf, -20, -mapHalf - 5), new THREE.Vector3(mapHalf, 40, -mapHalf + 2)) });
  addCollider({ type: 'box', box: new THREE.Box3(new THREE.Vector3(-mapHalf, -20, mapHalf - 2), new THREE.Vector3(mapHalf, 40, mapHalf + 5)) });
}

/**
 * Constrói o Terreno 3D Expandido em Grade de Chunks com PBR Contínuo (P10: via chunkStore)
 */
export function buildTerrain() {
  setChunksPerAxis(10);
  setTerrainLoader(createTerrainChunk);
  setTerrainUnloader(disposeTerrainChunk);
  const n = Math.round(getMapSize() / CHUNK_SIZE);
  for (let cz = 0; cz < n; cz++) {
    for (let cx = 0; cx < n; cx++) {
      loadChunk(cx, cz);
    }
  }
  addBoundaryColliders();
  return terrainChunks;
}
