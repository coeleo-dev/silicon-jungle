/**
 * Desvio multissensor (EnemyEntity.chase / Capdog).
 * Rode: node js/utils/steer.test.mjs
 */
import { pickSteerDir, headingFromXZ, lerpAngle } from './steer.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const open = pickSteerDir(0, 0, 10, 0, () => false);
assert(Math.abs(open.dx - 1) < 1e-9 && Math.abs(open.dz) < 1e-9, 'frente livre segue o alvo');
assert(!open.blocked, 'não marcado como blocked');

const wallAhead = pickSteerDir(0, 0, 10, 0, (dx, dz) => Math.abs(dz) < 0.2);
assert(Math.abs(wallAhead.dz) > 0.3, 'frente bloqueada → escolhe um sensor lateral');
assert(!wallAhead.blocked, 'achou um desvio');

const boxed = pickSteerDir(0, 0, 10, 0, () => true);
assert(boxed.blocked, 'todos os sensores bloqueados');

// Modelo do Capdog: focinho em +Z. yaw 0 = andar para frente, não de lado.
assert(Math.abs(headingFromXZ(0, 1)) < 1e-9, 'movimento +Z → yaw 0 (focinho à frente)');
assert(Math.abs(headingFromXZ(1, 0) - Math.PI / 2) < 1e-9, 'movimento +X → yaw +90°');
assert(Math.abs(headingFromXZ(-1, 0) + Math.PI / 2) < 1e-9, 'movimento -X → yaw -90°');
assert(Math.abs(lerpAngle(0, 0.4, 0.5) - 0.2) < 1e-9, 'lerp de ângulo no meio');
const wrap = lerpAngle(3.0, -3.0, 0.5);
assert(Math.abs(wrap) > 2.5, 'lerp atravessa o corte ±π pelo caminho curto');

if (process.exitCode) {
  console.error('\nsteer tests FAILED');
  process.exit(1);
}
console.log('\nsteer tests passed');
