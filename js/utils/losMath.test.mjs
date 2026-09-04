/**
 * LOS puro: caixa, cilindro (tronco/poste), laje, AABB de veículo rotacionado.
 * Rode: node js/utils/losMath.test.mjs
 */
import {
  colliderBlocksSegment,
  isLineOfSightClear,
  aabbFromYawFootprint
} from './losMath.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const wall = {
  type: 'box',
  box: { min: { x: -1, y: 0, z: 4 }, max: { x: 1, y: 4, z: 5 } }
};

assert(
  colliderBlocksSegment({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 1.6, z: 10 }, wall),
  'parede box bloqueia tiro frontal'
);
assert(
  !colliderBlocksSegment({ x: 0, y: 1.6, z: 0 }, { x: 8, y: 1.6, z: 0 }, wall),
  'tiro paralelo à parede não é bloqueado'
);
assert(
  !colliderBlocksSegment({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 1.6, z: 3.5 }, wall),
  'tiro que termina antes da parede passa'
);
assert(
  colliderBlocksSegment({ x: 0, y: 2, z: 4.5 }, { x: 0, y: 2, z: 20 }, wall),
  'origem dentro da parede ainda bloqueia (não atira através do volume)'
);

const tree = { type: 'cylinder', center: { x: 0, z: 8 }, radius: 1.2 };
assert(
  colliderBlocksSegment({ x: 0, y: 1.5, z: 0 }, { x: 0, y: 1.5, z: 16 }, tree),
  'tronco cilindro bloqueia tiro através da árvore'
);
assert(
  !colliderBlocksSegment({ x: 3, y: 1.5, z: 0 }, { x: 3, y: 1.5, z: 16 }, tree),
  'tiro ao lado do tronco passa'
);
assert(
  colliderBlocksSegment({ x: 0.2, y: 1.5, z: 8 }, { x: 0, y: 1.5, z: 20 }, tree),
  'origem dentro do tronco bloqueia (não atravessa a árvore)'
);
assert(
  colliderBlocksSegment({ x: 0, y: 12, z: 0 }, { x: 0, y: 12, z: 16 }, tree),
  'cilindro sem height é infinito (copa/tronco alto ainda cobre)'
);

const tank = {
  type: 'cylinder',
  center: { x: 0, y: 8, z: 10 },
  radius: 7.2,
  height: 16
};
assert(
  colliderBlocksSegment({ x: -20, y: 8, z: 10 }, { x: 20, y: 8, z: 10 }, tank),
  'cilindro com height bloqueia na faixa Y'
);
assert(
  !colliderBlocksSegment({ x: -20, y: 30, z: 10 }, { x: 20, y: 30, z: 10 }, tank),
  'cilindro com height não bloqueia acima da tampa'
);

const floor = { type: 'floor', minX: -5, maxX: 5, minZ: -5, maxZ: 5, y: 4 };
assert(
  colliderBlocksSegment({ x: 0, y: 1, z: 0 }, { x: 0, y: 8, z: 0 }, floor),
  'laje bloqueia tiro vertical entre andares'
);
assert(
  !colliderBlocksSegment({ x: 0, y: 1.6, z: -8 }, { x: 0, y: 1.6, z: 8 }, floor),
  'tiro horizontal abaixo da laje passa'
);

assert(
  !isLineOfSightClear({ x: 0, y: 1.6, z: 0 }, { x: 0, y: 1.6, z: 16 }, [wall, tree]),
  'LOS composto: parede ou árvore bloqueia'
);
assert(
  isLineOfSightClear({ x: 6, y: 1.6, z: 0 }, { x: 6, y: 1.6, z: 16 }, [wall, tree]),
  'LOS composto: desvio lateral livre'
);

const car0 = aabbFromYawFootprint({
  x: 0, z: 0, y: 2, halfW: 1.05, halfL: 2.25, height: 1.85, yaw: 0, pad: 0.2
});
assert(
  Math.abs(car0.min.x - (-1.25)) < 1e-9 && Math.abs(car0.max.x - 1.25) < 1e-9,
  'carro yaw=0: X = ±(halfW+pad)'
);
assert(
  Math.abs(car0.min.z - (-2.45)) < 1e-9 && Math.abs(car0.max.z - 2.45) < 1e-9,
  'carro yaw=0: Z = ±(halfL+pad)'
);

const car90 = aabbFromYawFootprint({
  x: 0, z: 0, y: 2, halfW: 1.05, halfL: 2.25, height: 1.85, yaw: Math.PI / 2, pad: 0.2
});
assert(
  Math.abs(car90.min.x - (-2.45)) < 1e-9 && Math.abs(car90.max.x - 2.45) < 1e-9,
  'carro yaw=90°: X troca com o comprimento'
);
assert(
  Math.abs(car90.min.z - (-1.25)) < 1e-9 && Math.abs(car90.max.z - 1.25) < 1e-9,
  'carro yaw=90°: Z troca com a largura'
);

const carBox = { type: 'box', box: { min: car90.min, max: car90.max } };
assert(
  colliderBlocksSegment({ x: -8, y: 2.5, z: 0 }, { x: 8, y: 2.5, z: 0 }, carBox),
  'carro rotacionado 90° bloqueia no eixo do comprimento visual'
);
assert(
  !colliderBlocksSegment({ x: 3, y: 2.5, z: -8 }, { x: 3, y: 2.5, z: 8 }, carBox),
  'carro rotacionado 90°: tiro além da AABB estreita passa'
);

if (process.exitCode) {
  console.error('\nlosMath tests FAILED');
  process.exit(1);
}
console.log('\nlosMath tests passed');
