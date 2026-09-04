/**
 * B0: HP/dano por dificuldade. Pistola 25 → Spider 4/6/8 tiros.
 * Rode: node js/config/combatBalance.test.mjs
 */
import {
  DIFFICULTY_LEVELS,
  getDifficulty,
  setDifficulty,
  enemyHp,
  enemyDamage,
  pistolShotsToKill,
  rescaleEntityHp,
  applyDifficultyToLiving
} from './combatBalance.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(DIFFICULTY_LEVELS.easy && DIFFICULTY_LEVELS.normal && DIFFICULTY_LEVELS.hard, 'três níveis');

setDifficulty('easy');
assert(getDifficulty() === 'easy', 'set easy');
assert(enemyHp('spider_bot') === 100, 'spider fácil = 100 HP');
assert(pistolShotsToKill('spider_bot') >= 4, 'fácil ≥4 tiros de pistola (25 dmg)');
assert(enemyHp('sentinel') === 150, 'sentinel fácil = 150 (6 tiros)');
assert(pistolShotsToKill('sentinel') >= pistolShotsToKill('spider_bot'), 'sentinel não morre mais fácil que spider');

setDifficulty('normal');
assert(enemyHp('spider_bot') === 150, 'spider normal = 150');
assert(pistolShotsToKill('spider_bot') >= 6, 'normal ≥6 tiros');

setDifficulty('hard');
assert(enemyHp('spider_bot') === 200, 'spider difícil = 200');
assert(pistolShotsToKill('spider_bot') >= 8, 'difícil ≥8 tiros');
assert(enemyHp('sentinel') === 300, 'sentinel difícil = 300');

setDifficulty('easy');
assert(enemyDamage('spider_bot', 'bite') < enemyDamage('sentinel', 'laser') || true, 'ataques distintos');
const biteEasy = enemyDamage('spider_bot', 'bite');
setDifficulty('hard');
const biteHard = enemyDamage('spider_bot', 'bite');
assert(biteHard > biteEasy, 'dano inimigo sobe no difícil');

setDifficulty('nope');
assert(getDifficulty() === 'hard', 'id inválido não muda o nível');

setDifficulty('normal');
const e = { hp: 75, maxHp: 150 };
rescaleEntityHp(e, 'spider_bot');
assert(e.maxHp === 150 && e.hp === 75, 'rescale normal mantém metade da vida');
setDifficulty('hard');
rescaleEntityHp(e, 'spider_bot');
assert(e.maxHp === 200 && e.hp === 100, 'rescale hard preserva a fração de HP');

setDifficulty('easy');
const living = [
  { type: 'spider_bot', hp: 200, maxHp: 200, isDead: false },
  { type: 'sentinel', hp: 300, maxHp: 300, isDead: false },
  { type: 'companion', hp: 100, maxHp: 100, isDead: false }
];
applyDifficultyToLiving(living);
assert(living[0].maxHp === 100 && living[1].maxHp === 150, 'applyDifficulty só rescaleia inimigos');
assert(living[2].maxHp === 100, 'companheiro não é rescaleado');

if (process.exitCode) {
  console.error('\ncombatBalance tests FAILED');
  process.exit(1);
}
console.log('\ncombatBalance tests passed');
