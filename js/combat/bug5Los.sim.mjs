/**
 * Regressão do Bug 5: as 3 camadas (disparo, COMBAT, projétil) contra parede/árvore/carro.
 * Rode: node js/combat/bug5Los.sim.mjs
 */
import { isLineOfSightClear, aabbFromYawFootprint } from '../utils/losMath.js';
import { resolveCombatState, shouldFireWeb, enemyProjectileOutcome } from './losPolicy.js';

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
  box: { min: { x: -2, y: 0, z: 9 }, max: { x: 2, y: 6, z: 10.2 } }
};
const tree = { type: 'cylinder', center: { x: 0, z: 12 }, radius: 1.4 };
const carAabb = aabbFromYawFootprint({
  x: 0, z: 8, y: 1, halfW: 1.05, halfL: 2.25, height: 1.85, yaw: Math.PI / 2, pad: 0.2
});
const car = { type: 'box', box: { min: carAabb.min, max: carAabb.max } };

const spider = { x: 0, y: 1.2, z: 0 };
const playerBehindWall = { x: 0, y: 1.6, z: 18 };
const playerInOpen = { x: 8, y: 1.6, z: 8 };

assert(
  !isLineOfSightClear(spider, playerBehindWall, [wall]),
  'camada LOS: parede bloqueia spider→player'
);
assert(
  !shouldFireWeb({ hasLos: false, dist: 18 }),
  'camada 1: SpiderBot não cospe web sem LOS'
);
assert(
  shouldFireWeb({ hasLos: isLineOfSightClear(spider, playerInOpen, [wall]), dist: 11.3 }),
  'camada 1: SpiderBot cospe web com LOS livre'
);

assert(
  resolveCombatState({
    canSeePlayer: false, dist: 18, aggroRange: 28, leashRange: 36, current: 'COMBAT'
  }) === 'PATROL',
  'camada 2: Sentinel sai de COMBAT ao perder visão (não termina a rajada)'
);

const stepIntoWall = enemyProjectileOutcome({
  playerHit: true,
  losToPlayer: isLineOfSightClear({ x: 0, y: 1.6, z: 8 }, playerBehindWall, [wall]),
  losAlongStep: isLineOfSightClear({ x: 0, y: 1.6, z: 8 }, { x: 0, y: 1.6, z: 11 }, [wall])
});
assert(stepIntoWall === 'hitWorld', 'camada 3: projétil que atravessaria a parede morre no mundo');

assert(!isLineOfSightClear(spider, playerBehindWall, [tree]), 'árvore (cylinder) bloqueia LOS');
assert(!isLineOfSightClear({ x: -10, y: 1.6, z: 8 }, { x: 10, y: 1.6, z: 8 }, [car]), 'carro rotacionado bloqueia LOS');
assert(
  isLineOfSightClear({ x: 4, y: 1.6, z: -4 }, { x: 4, y: 1.6, z: 20 }, [car]),
  'desvio ao lado do carro rotacionado continua livre'
);

if (process.exitCode) {
  console.error('\nbug5 LOS sim FAILED');
  process.exit(1);
}
console.log('\nbug5 LOS sim passed');
