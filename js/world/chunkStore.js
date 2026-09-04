/**
 * chunkStore — índices e ciclo de vida de chunks (P10).
 * Matemática pura; o loader de terreno é injectado para não puxar THREE nos testes.
 */

export const CHUNK_SIZE = 60;
export const DEFAULT_CHUNKS_PER_AXIS = 8;

let chunksPerAxis = DEFAULT_CHUNKS_PER_AXIS;
const loaded = new Map();
let originX = 0;
let originZ = 0;
let streamingEnabled = false;
let terrainLoader = null;
let terrainUnloader = null;
let vegetationLoader = null;
let vegetationUnloader = null;

/** Chebyshev: load se <= LOAD, unload se > UNLOAD (histerese). */
export const LOAD_CHUNKS = 2;
export const UNLOAD_CHUNKS = 3;

/** Metade da placa antiga (480 m). Chunks fora disto são o anel P12/P13. */
export const RING_INNER_HALF = 240;

/** Prefetch: load de veg = raio visual; 2×60 m ≫ 20 m (sem pop-in na fronteira). */
export const VEG_PREFETCH_METERS = 20;

export function getChunksPerAxis() {
  return chunksPerAxis;
}

export function getMapSize() {
  return CHUNK_SIZE * chunksPerAxis;
}

export function setChunksPerAxis(n) {
  chunksPerAxis = n;
}

export function chunkIndex(cx, cz) {
  return cz * chunksPerAxis + cx;
}

export function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

export function worldToChunk(x, z) {
  const origin = -getMapSize() / 2;
  const cx = Math.floor((x - origin) / CHUNK_SIZE);
  const cz = Math.floor((z - origin) / CHUNK_SIZE);
  return { cx, cz };
}

export function chunkWorldOrigin(cx, cz) {
  const origin = -getMapSize() / 2;
  const startX = origin + cx * CHUNK_SIZE;
  const startZ = origin + cz * CHUNK_SIZE;
  return {
    startX,
    startZ,
    centerX: startX + CHUNK_SIZE / 2,
    centerZ: startZ + CHUNK_SIZE / 2
  };
}

export function isChunkInGrid(cx, cz) {
  return cx >= 0 && cz >= 0 && cx < chunksPerAxis && cz < chunksPerAxis;
}

/** True se o AABB do chunk sai da placa 480 m (anel 600 m). */
export function isRingChunk(cx, cz) {
  const { startX, startZ } = chunkWorldOrigin(cx, cz);
  const endX = startX + CHUNK_SIZE;
  const endZ = startZ + CHUNK_SIZE;
  return (
    startX < -RING_INNER_HALF ||
    endX > RING_INNER_HALF ||
    startZ < -RING_INNER_HALF ||
    endZ > RING_INNER_HALF
  );
}

export function countRingChunks() {
  let n = 0;
  forEachRingChunk(() => {
    n++;
  });
  return n;
}

export function forEachRingChunk(fn) {
  const axis = chunksPerAxis;
  for (let cz = 0; cz < axis; cz++) {
    for (let cx = 0; cx < axis; cx++) {
      if (isRingChunk(cx, cz)) fn(cx, cz, chunkWorldOrigin(cx, cz));
    }
  }
}

export function setTerrainLoader(fn) {
  terrainLoader = fn;
}

export function setTerrainUnloader(fn) {
  terrainUnloader = fn;
}

export function setVegetationLoader(fn) {
  vegetationLoader = fn;
}

export function setVegetationUnloader(fn) {
  vegetationUnloader = fn;
}

export function chebyshevToOrigin(cx, cz) {
  const o = worldToChunk(originX, originZ);
  return Math.max(Math.abs(cx - o.cx), Math.abs(cz - o.cz));
}

function syncStreaming() {
  const n = chunksPerAxis;
  for (let cz = 0; cz < n; cz++) {
    for (let cx = 0; cx < n; cx++) {
      const d = chebyshevToOrigin(cx, cz);
      const rec = loaded.get(chunkKey(cx, cz));
      if (d <= LOAD_CHUNKS) {
        loadChunk(cx, cz);
      } else if (d > UNLOAD_CHUNKS) {
        if (rec) unloadChunk(cx, cz);
      }
    }
  }
}

export function getLoadedChunk(cx, cz) {
  return loaded.get(chunkKey(cx, cz)) || null;
}

export function getLoadedCount() {
  return loaded.size;
}

export function registerLoaded(cx, cz, record) {
  loaded.set(chunkKey(cx, cz), record);
}

export function loadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  if (!isChunkInGrid(cx, cz)) return null;
  let record = loaded.get(key);
  if (!record) {
    record = terrainLoader ? terrainLoader(cx, cz) : { cx, cz };
    loaded.set(key, record);
  }
  if (vegetationLoader && !record.vegReady) {
    vegetationLoader(cx, cz, record);
    record.vegReady = true;
  }
  return record;
}

/** P10: stub. P11 faz dispose real. */
export function unloadChunk(cx, cz) {
  const key = chunkKey(cx, cz);
  const record = loaded.get(key);
  if (!record) return;
  if (vegetationUnloader) vegetationUnloader(record);
  record.vegReady = false;
  if (terrainUnloader) terrainUnloader(record);
  loaded.delete(key);
}

export function enableStreaming(on = true) {
  streamingEnabled = on;
  if (on) syncStreaming();
}

export function isStreamingEnabled() {
  return streamingEnabled;
}

/**
 * P10: no-op visual se o raio cobrir a grelha inteira (streaming desligado).
 * P11: sincroniza load/unload.
 */
export function setStreamingOrigin(x, z) {
  originX = x;
  originZ = z;
  if (!streamingEnabled) return;
  syncStreaming();
}

export function getStreamingOrigin() {
  return { x: originX, z: originZ };
}

export function clearChunkStore() {
  loaded.clear();
  streamingEnabled = false;
  originX = 0;
  originZ = 0;
  chunksPerAxis = DEFAULT_CHUNKS_PER_AXIS;
}

export function loadedChunkKeys() {
  return [...loaded.keys()];
}
