/**
 * Spawn livre: nunca devolver um ponto sólido (prédio/árvore/carro/rocha).
 * Rode: node js/world/spawnPlacement.test.mjs
 */
import { isSpawnClear, findClearSpawn } from './spawnPlacement.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

function boxBlocked(minX, maxX, minZ, maxZ) {
  return (x, z, r) => x + r >= minX && x - r <= maxX && z + r >= minZ && z - r <= maxZ;
}

function circleBlocked(cx, cz, radius) {
  return (x, z, r) => {
    const dx = x - cx;
    const dz = z - cz;
    const need = radius + r;
    return dx * dx + dz * dz < need * need;
  };
}

assert(isSpawnClear(0, 0, 0.7, { isSolidBlocked: () => false }), 'chão livre é spawn válido');
assert(!isSpawnClear(0, 0, 0.7, { isSolidBlocked: () => true }), 'sólido rejeita spawn');
assert(
  !isSpawnClear(0, 0, 0.7, { isZoneFree: () => false, isSolidBlocked: () => false }),
  'zona de exclusão (prédio) rejeita spawn mesmo sem colisor local'
);

const insideTree = findClearSpawn(0, 0, {
  radius: 0.7,
  maxDistance: 8,
  ringStep: 1,
  isClear: (x, z, r) => !circleBlocked(0, 0, 1.4)(x, z, r),
  fallback: { x: 10, z: 0 }
});
assert(Math.hypot(insideTree.x, insideTree.z) >= 1.4 + 0.7 - 0.05, 'sai do tronco da árvore');
assert(insideTree.relocated === true, 'marca relocated quando o ponto original era inválido');

const insideCar = findClearSpawn(0, 0, {
  radius: 0.7,
  maxDistance: 10,
  ringStep: 1,
  isClear: (x, z, r) => !boxBlocked(-1.2, 1.2, -2.5, 2.5)(x, z, r),
  fallback: { x: 20, z: 0 }
});
assert(Math.abs(insideCar.x) > 1.2 + 0.7 - 0.05 || Math.abs(insideCar.z) > 2.5 + 0.7 - 0.05, 'sai da AABB do carro');

const hugeBuilding = findClearSpawn(0, 0, {
  radius: 0.7,
  maxDistance: 8,
  ringStep: 1,
  isClear: (x, z, r) => !boxBlocked(-16, 16, -16, 16)(x, z, r),
  fallback: { x: 0, z: 22 }
});
assert(
  hugeBuilding.x === 0 && hugeBuilding.z === 22,
  'prédio maior que maxDistance não devolve o ponto original — usa fallback da praça'
);

const trapped = findClearSpawn(0, 0, {
  radius: 0.7,
  maxDistance: 4,
  ringStep: 1,
  isClear: () => false,
  fallback: { x: 3, z: 3 }
});
assert(trapped.x === 3 && trapped.z === 3, 'se nada estiver livre, ainda assim NÃO devolve o ponto original');

const alreadyFree = findClearSpawn(5, 9, {
  radius: 0.7,
  isClear: () => true,
  fallback: { x: 0, z: 0 }
});
assert(alreadyFree.x === 5 && alreadyFree.z === 9 && alreadyFree.relocated === false, 'ponto já livre permanece');

const fallbackAlsoBlocked = findClearSpawn(0, 0, {
  radius: 0.7,
  maxDistance: 6,
  ringStep: 1,
  isClear: (x, z, r) => {
    const inOriginBlob = Math.hypot(x, z) < 10;
    const inFallbackTree = Math.hypot(x - 8, z) < 1.2 + r;
    return !inOriginBlob && !inFallbackTree;
  },
  fallback: { x: 8, z: 0 }
});
assert(
  Math.hypot(fallbackAlsoBlocked.x, fallbackAlsoBlocked.z) >= 10 - 0.05,
  'se o fallback também estiver sólido, busca anéis ao redor dele'
);
assert(
  Math.hypot(fallbackAlsoBlocked.x - 8, fallbackAlsoBlocked.z) >= 1.2 + 0.7 - 0.05,
  'não permanece dentro da árvore no ponto de fallback'
);

if (process.exitCode) {
  console.error('\nspawnPlacement tests FAILED');
  process.exit(1);
}
console.log('\nspawnPlacement tests passed');
