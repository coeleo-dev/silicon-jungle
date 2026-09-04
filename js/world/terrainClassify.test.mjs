/**
 * Chunk urbano: AABB vs disco (não o centro do chunk).
 * Rode: node js/world/terrainClassify.test.mjs
 */
import { aabbHitsDisk, classifyTerrainChunk, URBAN_RADIUS, TRAIL_RADIUS, materialIdForKind } from './terrainClassify.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

// Chunks 60 m; os 4 centrais têm centro a ~42 m — um corte dist<30 não pintaria nenhum.
assert(
  aabbHitsDisk(0, 60, 0, 60, URBAN_RADIUS),
  'chunk [0,60]x[0,60] intercepta disco r=50 (toca a origem)'
);
assert(
  classifyTerrainChunk({ startX: 0, startZ: 0, chunkSize: 60, dist: 42.4, maxH: 2 }) === 'urban',
  'chunk central (centro ~42 m) é urbano, não selva'
);
assert(
  classifyTerrainChunk({ startX: -60, startZ: -60, chunkSize: 60, dist: 42.4, maxH: 2 }) === 'urban',
  'chunk NW central também é urbano'
);

assert(
  !aabbHitsDisk(60, 120, -30, 30, URBAN_RADIUS),
  'chunk começando em x=60 não entra no disco urbano'
);
assert(
  aabbHitsDisk(60, 120, -30, 30, TRAIL_RADIUS),
  'chunk do anel intercepta disco r=95'
);
assert(
  classifyTerrainChunk({ startX: 60, startZ: -30, chunkSize: 60, dist: 90, maxH: 3 }) === 'trails',
  'anel 50–95 é trilho / transição'
);

assert(
  classifyTerrainChunk({ startX: 100, startZ: 0, chunkSize: 60, dist: 133, maxH: 4 }) === 'jungle',
  'periferia baixa é selva'
);
assert(
  classifyTerrainChunk({ startX: 180, startZ: 180, chunkSize: 60, dist: 160, maxH: 16 }) === 'mountain_cliff',
  'montanha (maxH>14) prevalece sobre o disco'
);

assert(
  materialIdForKind('urban') === 'CONCRETE_BUNKER',
  'lotes urbanos usam concreto/ruína, não selva nem azulejo Tiles074'
);
assert(
  materialIdForKind('urban') !== 'TILES_PCB_STREET',
  'Tiles074 é xadrez de cerâmica — nunca no terreno'
);
assert(
  materialIdForKind('jungle') === 'GROUND_JUNGLE',
  'selva usa GROUND_JUNGLE'
);
assert(
  materialIdForKind('trails') === 'GROUND_TRAILS',
  'anel de transição usa GROUND_TRAILS'
);

if (process.exitCode) {
  console.error('terrainClassify tests failed');
} else {
  console.log('terrainClassify tests passed');
}
