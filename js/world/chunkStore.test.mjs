import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHUNK_SIZE,
  chunkIndex,
  worldToChunk,
  chunkWorldOrigin,
  isChunkInGrid,
  isRingChunk,
  countRingChunks,
  getMapSize,
  setChunksPerAxis,
  clearChunkStore,
  DEFAULT_CHUNKS_PER_AXIS,
  loadChunk,
  getLoadedChunk,
  getLoadedCount,
  setTerrainLoader,
  enableStreaming,
  setStreamingOrigin,
  LOAD_CHUNKS,
  UNLOAD_CHUNKS,
  VEG_PREFETCH_METERS,
  RING_INNER_HALF
} from './chunkStore.js';
import { CONFIG } from '../config/constants.js';

describe('chunkStore índices', () => {
  beforeEach(() => {
    clearChunkStore();
  });

  it('usa tiles de 60 m e grelha 8×8 (480 m)', () => {
    assert.equal(CHUNK_SIZE, 60);
    assert.equal(DEFAULT_CHUNKS_PER_AXIS, 8);
    assert.equal(getMapSize(), 480);
  });

  it('chunkIndex percorre a grelha em row-major cz*N+cx', () => {
    assert.equal(chunkIndex(0, 0), 0);
    assert.equal(chunkIndex(7, 0), 7);
    assert.equal(chunkIndex(0, 1), 8);
    assert.equal(chunkIndex(7, 7), 63);
  });

  it('worldToChunk mapeia o centro e os cantos da placa 480 m', () => {
    assert.deepEqual(worldToChunk(0, 0), { cx: 4, cz: 4 });
    assert.deepEqual(worldToChunk(-240, -240), { cx: 0, cz: 0 });
    assert.deepEqual(worldToChunk(239.9, 239.9), { cx: 7, cz: 7 });
    assert.deepEqual(worldToChunk(-80, 80), { cx: 2, cz: 5 });
  });

  it('chunkWorldOrigin bate com o layout actual de terrain.js', () => {
    const c00 = chunkWorldOrigin(0, 0);
    assert.equal(c00.startX, -240);
    assert.equal(c00.startZ, -240);
    assert.equal(c00.centerX, -210);
    assert.equal(c00.centerZ, -210);
    const c44 = chunkWorldOrigin(4, 4);
    assert.equal(c44.centerX, 30);
    assert.equal(c44.centerZ, 30);
  });

  it('cobertura 8×8: 64 índices válidos', () => {
    let n = 0;
    for (let cz = 0; cz < 8; cz++) {
      for (let cx = 0; cx < 8; cx++) {
        assert.equal(isChunkInGrid(cx, cz), true);
        n++;
      }
    }
    assert.equal(n, 64);
    assert.equal(isChunkInGrid(-1, 0), false);
    assert.equal(isChunkInGrid(8, 0), false);
  });

  it('setChunksPerAxis alarga o mapa (P12)', () => {
    setChunksPerAxis(10);
    assert.equal(getMapSize(), 600);
    assert.deepEqual(worldToChunk(0, 0), { cx: 5, cz: 5 });
    assert.deepEqual(worldToChunk(-300, -300), { cx: 0, cz: 0 });
    assert.deepEqual(worldToChunk(299.9, 299.9), { cx: 9, cz: 9 });
  });
});

describe('chunkStore streaming (P11)', () => {
  beforeEach(() => {
    clearChunkStore();
    setTerrainLoader((cx, cz) => ({ cx, cz }));
    for (let cz = 0; cz < 8; cz++) {
      for (let cx = 0; cx < 8; cx++) loadChunk(cx, cz);
    }
  });

  it('no centro descarrega os cantos e mantém o chunk sob os pés', () => {
    assert.equal(getLoadedCount(), 64);
    enableStreaming(true);
    setStreamingOrigin(0, 0);
    assert.ok(getLoadedChunk(4, 4), 'chunk do centro carregado');
    assert.equal(getLoadedChunk(0, 0), null, 'canto descarregado');
    assert.ok(getLoadedCount() < 64);
    assert.ok(getLoadedCount() >= (LOAD_CHUNKS * 2 + 1) ** 2);
    assert.ok(UNLOAD_CHUNKS > LOAD_CHUNKS);
  });

  it('na borda o chão local permanece', () => {
    enableStreaming(true);
    setStreamingOrigin(-210, -210);
    assert.ok(getLoadedChunk(0, 0), 'chunk dos pés na borda');
    assert.equal(getLoadedChunk(7, 7), null);
  });
});

describe('chunkStore anel 600 m (P12/P13)', () => {
  beforeEach(() => {
    clearChunkStore();
  });

  it('placa 480 m não tem anel', () => {
    assert.equal(countRingChunks(), 0);
    assert.equal(isRingChunk(0, 0), false);
    assert.equal(isRingChunk(7, 7), false);
  });

  it('grelha 10×10: 600 m, 36 chunks de anel, BOUNDS 298', () => {
    setChunksPerAxis(10);
    assert.equal(getMapSize(), 600);
    assert.equal(RING_INNER_HALF, 240);
    assert.equal(countRingChunks(), 36);
    assert.equal(isRingChunk(0, 0), true);
    assert.equal(isRingChunk(9, 9), true);
    assert.equal(isRingChunk(1, 1), false);
    assert.equal(isRingChunk(5, 5), false);
    assert.equal(CONFIG.WORLD.BOUNDS, 298);
    assert.ok(CONFIG.WORLD.BOUNDS < getMapSize() / 2);
    assert.ok(CONFIG.WORLD.BOUNDS > RING_INNER_HALF);
  });

  it('prefetch de vegetação cobre 20 m (P13)', () => {
    assert.ok(LOAD_CHUNKS * CHUNK_SIZE >= VEG_PREFETCH_METERS);
  });
});

describe('chunkStore streaming 10×10 (P12)', () => {
  beforeEach(() => {
    clearChunkStore();
    setChunksPerAxis(10);
    setTerrainLoader((cx, cz) => ({ cx, cz }));
    for (let cz = 0; cz < 10; cz++) {
      for (let cx = 0; cx < 10; cx++) loadChunk(cx, cz);
    }
  });

  it('no centro descarrega os cantos do mapa 600 m', () => {
    assert.equal(getLoadedCount(), 100);
    enableStreaming(true);
    setStreamingOrigin(0, 0);
    assert.ok(getLoadedChunk(5, 5), 'chunk do centro');
    assert.equal(getLoadedChunk(0, 0), null, 'canto descarregado');
    assert.ok(getLoadedCount() < 100);
    assert.ok(getLoadedCount() >= (LOAD_CHUNKS * 2 + 1) ** 2);
  });

  it('a ~270 m o chão local permanece (andar ~300 m)', () => {
    enableStreaming(true);
    setStreamingOrigin(-270, -270);
    assert.ok(getLoadedChunk(0, 0), 'chunk dos pés no anel');
    assert.equal(getLoadedChunk(9, 9), null);
    setStreamingOrigin(270, 0);
    const feet = worldToChunk(270, 0);
    assert.ok(getLoadedChunk(feet.cx, feet.cz), 'chão sob os pés a 270 m');
    assert.ok(UNLOAD_CHUNKS > LOAD_CHUNKS);
  });
});
