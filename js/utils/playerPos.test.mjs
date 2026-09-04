/**
 * Posição do player no update das entidades (Capdog follow).
 * Rode: node js/utils/playerPos.test.mjs
 */
import { resolvePlayerPos } from './playerPos.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const cam = { position: { x: 2, y: 1.8, z: 30 } };

assert(resolvePlayerPos(null, null) === null, 'sem ctx nem câmera → null (não segue)');
assert(resolvePlayerPos({}, null) === null, 'PlayerController vazio sem câmera → null');

const fromFallback = resolvePlayerPos({}, cam);
assert(fromFallback && fromFallback.x === 2 && fromFallback.z === 30, 'fallback da câmera da cena');

const fromPlayerPos = resolvePlayerPos({ playerPos: { x: 9, y: 2, z: 1 } }, cam);
assert(fromPlayerPos.x === 9 && fromPlayerPos.z === 1, 'ctx.playerPos tem prioridade');

const fromCtxCam = resolvePlayerPos({ camera: { position: { x: 4, y: 1.8, z: 5 } } }, cam);
assert(fromCtxCam.x === 4 && fromCtxCam.z === 5, 'ctx.camera.position (PlayerController.camera)');

if (process.exitCode) {
  console.error('\nplayerPos tests FAILED');
  process.exit(1);
}
console.log('\nplayerPos tests passed');
