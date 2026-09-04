/**
 * Testes do layout da escada de incêndio (patamar U vs lances).
 * Rode: node js/world/structures/buildings/stairLayout.test.mjs
 */
import { fireEscapeLayout, LANDING_OVERSHOOT, STAIR_W } from './stairLayout.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const layout = fireEscapeLayout({ width: 16, depth: 16, height: 14 });
const { landings, flights, spanZ, stairW } = layout;

assert(stairW === STAIR_W && STAIR_W >= 3.2, 'piso andável >= 3.2m');
assert(landings.length === flights.length + 1, 'um patamar a mais que lances');
assert(LANDING_OVERSHOOT >= 3.5, 'overshoot de curva >= 3.5m');

const pad0 = landings[0];
const pad1 = landings[1];
const f0 = flights[0];
const first = f0.steps[0];
const second = f0.steps[1];
const last = f0.steps[f0.steps.length - 1];

assert(!pad0.hasBackWall, 'patamar do chão sem parede de fundo (entrada)');
assert(pad1.hasBackWall, 'patamar de curva com parede de fundo');

assert(first.z >= pad0.minZ && first.z <= pad0.maxZ, 'primeiro degrau encosta no patamar 0');
assert(!(second.z >= pad0.minZ && second.z <= pad0.maxZ), 'segundo degrau NÃO fica em cima do patamar 0');
assert(last.z >= pad1.minZ && last.z <= pad1.maxZ, 'último degrau encosta no patamar 1 (lábio)');
assert(!(f0.steps[f0.steps.length - 2].z >= pad1.minZ && f0.steps[f0.steps.length - 2].z <= pad1.maxZ),
  'penúltimo degrau não é engolido pelo patamar 1');

const midEven = f0.steps[4];
const midOdd = layout.flights[1] ? layout.flights[1].steps[4] : null;
if (midOdd) {
  const overlapX = !(midEven.maxX < midOdd.minX || midOdd.maxX < midEven.minX);
  assert(!overlapX, 'lances par e ímpar não compartilham X no meio do vão');
}

const padDepth = pad0.maxZ - pad0.minZ;
assert(padDepth >= LANDING_OVERSHOOT, `pad tem profundidade de curva (${padDepth.toFixed(2)}m)`);

const outer = Math.max(Math.abs(pad0.minZ), Math.abs(pad0.maxZ));
assert(outer >= spanZ / 2 + LANDING_OVERSHOOT - 0.05, 'pad ultrapassa o lance em Z');

const tall = fireEscapeLayout({ width: 20, depth: 20, height: 42 });
assert(tall.numFlights >= 10, 'torre alta gera muitos lances');
assert(tall.landings[tall.landings.length - 1].y === 42, 'patamar do topo alinha com o telhado');

if (process.exitCode) {
  console.error('\nstairLayout tests FAILED');
  process.exit(1);
}
console.log('\nstairLayout tests passed');
