/**
 * chunkVegetation — InstancedMesh por chunk (P11). Templates partilhados; GPU só nos chunks carregados.
 */
import { scene } from '../core/scene.js?v=20260821';
import { worldToChunk, chunkKey } from './chunkStore.js?v=20260903';
import { LODInstanced } from './vegetation/VegetationLOD.js?v=20260828';

/** @type {{ fullGeo: object, simpleGeo: object, material: object, lod0Dist: number, farDist: number, shadowOpts: object, byChunk: Map<string, object[]> }[]} */
const species = [];
const liveLods = [];

export function captureLods(lods) {
  if (!lods) return;
  for (const lod of lods) {
    const byChunk = new Map();
    for (const d of lod.data) {
      const { cx, cz } = worldToChunk(d.x, d.z);
      const k = chunkKey(cx, cz);
      if (!byChunk.has(k)) byChunk.set(k, []);
      byChunk.get(k).push(d);
    }
    species.push({
      fullGeo: lod.full.geometry,
      simpleGeo: lod.simple ? lod.simple.geometry : null,
      material: lod.full.material,
      lod0Dist: Math.sqrt(lod.lod0DistSq),
      farDist: Math.sqrt(lod.farDistSq),
      shadowOpts: {
        castShadow: lod.full.castShadow,
        receiveShadow: lod.full.receiveShadow
      },
      byChunk
    });
    lod.detach();
  }
}

export function loadChunkVegetation(cx, cz, record) {
  const k = chunkKey(cx, cz);
  if (!record.vegLods) record.vegLods = [];
  for (const spec of species) {
    const placements = spec.byChunk.get(k);
    if (!placements || placements.length === 0) continue;
    const lod = new LODInstanced(
      spec.fullGeo,
      spec.simpleGeo,
      spec.material,
      placements.length,
      spec.lod0Dist,
      spec.farDist,
      spec.shadowOpts
    );
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      lod.add(p.matrix, p.x, p.z);
    }
    lod.addToScene(scene);
    lod.updateFromCamera(true);
    record.vegLods.push(lod);
    liveLods.push(lod);
  }
}

export function unloadChunkVegetation(record) {
  if (!record?.vegLods) return;
  for (const lod of record.vegLods) {
    const i = liveLods.indexOf(lod);
    if (i >= 0) liveLods.splice(i, 1);
    lod.disposeInstances();
  }
  record.vegLods = [];
}

export function updateLiveChunkLods() {
  for (let i = 0; i < liveLods.length; i++) {
    liveLods[i].updateFromCamera();
  }
}

export function placementsForChunk(cx, cz) {
  const k = chunkKey(cx, cz);
  let n = 0;
  for (const spec of species) {
    n += (spec.byChunk.get(k) || []).length;
  }
  return n;
}

/** P13: acrescenta placements gerados para um chunk do anel. */
export function addChunkPlacements(cx, cz, specIndex, placements) {
  const spec = species[specIndex];
  if (!spec) return;
  const k = chunkKey(cx, cz);
  if (!spec.byChunk.has(k)) spec.byChunk.set(k, []);
  spec.byChunk.get(k).push(...placements);
}

export function speciesCount() {
  return species.length;
}
