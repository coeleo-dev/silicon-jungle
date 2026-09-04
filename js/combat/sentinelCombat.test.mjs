/**
 * Padrões de rajada do Sentinel (Bug 9).
 * Rode: node js/combat/sentinelCombat.test.mjs
 */
import { pickBurstPattern, strafeOffset } from './sentinelCombat.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const a = pickBurstPattern(() => 0.1);
const b = pickBurstPattern(() => 0.5);
const c = pickBurstPattern(() => 0.9);
assert(a.shots === 2 && a.windup >= 0.4, 'padrão double: 2 tiros, windup visível');
assert(b.shots === 3 && b.windup >= 0.55, 'padrão triple: 3 tiros');
assert(c.shots === 4 && c.windup >= 0.75, 'padrão quad: 4 tiros, windup mais longo');
assert(new Set([a.name, b.name, c.name]).size === 3, 'três nomes de padrão');

assert(Math.abs(strafeOffset(0, 12)) < 0.01, 'strafe em t=0 é 0');
assert(strafeOffset(1.2, 12) !== 0, 'strafe lateral no meio-alcance');
assert(strafeOffset(1.2, 4) === 0, 'perto demais não strafe (vai fechar)');
assert(strafeOffset(1.2, 22) === 0, 'longe demais caminha em linha, não strafe');

if (process.exitCode) {
  console.error('\nsentinelCombat tests FAILED');
  process.exit(1);
}
console.log('\nsentinelCombat tests passed');
