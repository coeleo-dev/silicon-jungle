/**
 * Testes da faixa de piso nos pés (escadas empilhadas no mesmo XZ).
 * Rode: node js/utils/floorBand.test.mjs
 */
import { isSlabInFootBand, isBoxTopWalkable, FLOOR_CATCH_BELOW, FLOOR_STEP_UP } from './floorBand.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const footY = 5.0;

assert(isSlabInFootBand(5.0, footY), 'laje na altura dos pés é candidata');
assert(isSlabInFootBand(footY + 0.85, footY), 'laje +0.85m (auto-step) é candidata');
assert(isSlabInFootBand(footY + 0.35, footY), 'próximo degrau acima (+0.35) é candidato');
assert(isSlabInFootBand(footY - 0.20, footY), 'laje 0.20m abaixo ainda segura (não flutua)');
assert(!isSlabInFootBand(footY - 0.35, footY), 'laje 0.35m abaixo fica fora (gravidade desce)');
assert(!isSlabInFootBand(footY + 3.5, footY), 'lance 3.5m acima NÃO puxa o player');
assert(!isSlabInFootBand(footY - 3.5, footY), 'lance 3.5m abaixo NÃO gruda o player');
assert(!isSlabInFootBand(footY + 0.86, footY), 'acima de +0.85 não é auto-step');
assert(!isSlabInFootBand(footY - 0.26, footY), 'abaixo de -0.25 não segura');

assert(FLOOR_CATCH_BELOW === 0.25, 'FLOOR_CATCH_BELOW = 0.25');
assert(FLOOR_STEP_UP === 0.85, 'FLOOR_STEP_UP = 0.85');

assert(isBoxTopWalkable(footY + 0.50, footY), 'caixa +0.50m é auto-step de degrau');
assert(isBoxTopWalkable(footY - 0.35, footY), 'caixa 0.35m abaixo pega na descida');
assert(isBoxTopWalkable(footY - 0.85, footY), 'caixa 0.85m abaixo ainda pega a queda');
assert(!isBoxTopWalkable(footY + 0.51, footY), 'caixa +0.51m é parede, não degrau');
assert(!isBoxTopWalkable(footY - 3.5, footY), 'caixa do lance de baixo (3.5m) não teleporta');
assert(!isBoxTopWalkable(footY + 3.5, footY), 'caixa do lance de cima (3.5m) não puxa');

if (process.exitCode) {
  console.error('\nfloorBand tests FAILED');
  process.exit(1);
}
console.log('\nfloorBand tests passed');
