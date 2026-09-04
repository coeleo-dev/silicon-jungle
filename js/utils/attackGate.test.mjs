/**
 * Não dispara no mesmo gesto que pede pointer lock.
 * Rode: node js/utils/attackGate.test.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATTACK_LOCK_GRACE_MS,
  shouldAcceptAttack,
  createAttackInputState,
  onAttackPointerLock,
  onAttackButtonDown,
  onAttackButtonUp
} from './attackGate.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(ATTACK_LOCK_GRACE_MS >= 250, 'grace de pointer lock >= 250ms');
assert(
  shouldAcceptAttack({ isLocked: false, now: 1000, lockGrantedAt: 0 }) === false,
  'sem pointer lock não ataca'
);
assert(
  shouldAcceptAttack({ isLocked: true, now: 100, lockGrantedAt: 100 }) === false,
  'no instante do lock não ataca'
);
assert(
  shouldAcceptAttack({
    isLocked: true,
    now: 100 + ATTACK_LOCK_GRACE_MS - 1,
    lockGrantedAt: 100
  }) === false,
  'ainda dentro da grace não ataca'
);
assert(
  shouldAcceptAttack({
    isLocked: true,
    now: 100 + ATTACK_LOCK_GRACE_MS,
    lockGrantedAt: 100
  }) === true,
  'depois da grace ataca'
);
assert(
  shouldAcceptAttack({
    isLocked: true,
    now: 100 + ATTACK_LOCK_GRACE_MS,
    lockGrantedAt: 100,
    buildMode: true
  }) === false,
  'modo build não ataca'
);

const dir = dirname(fileURLToPath(import.meta.url));
const playerSrc = readFileSync(join(dir, '../entities/player.js'), 'utf8');
assert(playerSrc.includes('shouldAcceptAttack'), 'player.js usa shouldAcceptAttack');
assert(
  shouldAcceptAttack({ isLocked: true, now: 5000, lockGrantedAt: 0 }) === false,
  'lockGrantedAt 0 significa que o lock ainda não ocorreu — não ataca'
);

let input = createAttackInputState();
let down1 = onAttackButtonDown(input);
assert(down1.shouldFire === true, 'primeiro mousedown dispara');
input = down1.state;
let down2 = onAttackButtonDown(input);
assert(down2.shouldFire === false, 'mousedown repetido sem mouseup NÃO dispara (tiro automático)');
input = onAttackButtonUp(down2.state);
let down3 = onAttackButtonDown(input);
assert(down3.shouldFire === true, 'depois do mouseup o próximo clique dispara');

input = createAttackInputState();
input = onAttackButtonDown(input).state; // botão ainda pressionado no clique de iniciar
input = onAttackPointerLock(input);
let ghost = onAttackButtonDown(input);
assert(ghost.shouldFire === false, 'pointer lock com botão preso não dispara');
input = onAttackButtonUp(ghost.state);
let real = onAttackButtonDown(input);
assert(real.shouldFire === true, 'após soltar o botão, o clique real dispara');

assert(playerSrc.includes('onAttackButtonDown'), 'player.js usa onAttackButtonDown');
assert(playerSrc.includes('onAttackButtonUp'), 'player.js usa onAttackButtonUp');


if (process.exitCode) console.error('attackGate tests failed');
else console.log('attackGate tests passed');
