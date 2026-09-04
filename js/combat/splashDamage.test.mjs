import { splashVictims } from './splashDamage.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const entities = [
  { id: 'a', x: 0, z: 0, isDead: false },
  { id: 'b', x: 2, z: 0, isDead: false },
  { id: 'c', x: 10, z: 0, isDead: false },
  { id: 'd', x: 1.5, z: 0, isDead: true }
];

assert(splashVictims('a', 0, 0, entities, 0, 25).length === 0, 'radius 0 não espalha');
const hits = splashVictims('a', 0, 0, entities, 3, 25);
assert(hits.some(h => h.id === 'b'), 'vizinho no raio leva splash');
assert(!hits.some(h => h.id === 'a'), 'alvo primário não entra no splash');
assert(!hits.some(h => h.id === 'c'), 'longe demais não leva splash');
assert(!hits.some(h => h.id === 'd'), 'morto não leva splash');
assert(hits.every(h => h.damage >= 1), 'splash mínimo 1');

if (process.exitCode) console.error('splashDamage tests failed');
else console.log('splashDamage tests passed');
