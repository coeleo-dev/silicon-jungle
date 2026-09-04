/**
 * Política de combate do Bug 5: só dispara com LOS; perde COMBAT sem visão;
 * projétil inimigo não acerta jogador através de obstáculo.
 * Rode: node js/combat/losPolicy.test.mjs
 */
import { resolveCombatState, shouldFireWeb, enemyProjectileOutcome } from './losPolicy.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(
  resolveCombatState({
    canSeePlayer: true, dist: 10, aggroRange: 28, leashRange: 36, current: 'PATROL'
  }) === 'COMBAT',
  'vê o player dentro do aggro → COMBAT'
);
assert(
  resolveCombatState({
    canSeePlayer: false, dist: 10, aggroRange: 28, leashRange: 36, current: 'COMBAT'
  }) === 'PATROL',
  'perde LOS ainda no leash → sai de COMBAT (não completa rajada atrás da parede)'
);
assert(
  resolveCombatState({
    canSeePlayer: true, dist: 40, aggroRange: 28, leashRange: 36, current: 'COMBAT'
  }) === 'PATROL',
  'além do leash → PATROL mesmo com visão'
);
assert(
  resolveCombatState({
    canSeePlayer: true, dist: 32, aggroRange: 28, leashRange: 36, current: 'COMBAT'
  }) === 'COMBAT',
  'visível entre aggro e leash → mantém COMBAT'
);
assert(
  resolveCombatState({
    canSeePlayer: true, dist: 32, aggroRange: 28, leashRange: 36, current: 'PATROL'
  }) === 'PATROL',
  'visível entre aggro e leash em PATROL → não aggro à distância'
);

assert(shouldFireWeb({ hasLos: true, dist: 12 }), 'web com LOS na faixa dispara');
assert(!shouldFireWeb({ hasLos: false, dist: 12 }), 'web sem LOS não dispara');
assert(!shouldFireWeb({ hasLos: true, dist: 4 }), 'web perto demais não dispara (é bite)');
assert(!shouldFireWeb({ hasLos: true, dist: 30 }), 'web fora do alcance não dispara');

assert(
  enemyProjectileOutcome({ playerHit: true, losToPlayer: false, losAlongStep: false }) === 'hitWorld',
  'segmento atravessa parede até o player → impacto no mundo, sem dano'
);
assert(
  enemyProjectileOutcome({ playerHit: true, losToPlayer: true, losAlongStep: true }) === 'hitPlayer',
  'player à vista no segmento → acerta o player'
);
assert(
  enemyProjectileOutcome({ playerHit: false, losToPlayer: false, losAlongStep: false }) === 'hitWorld',
  'bate na parede no meio do voo'
);
assert(
  enemyProjectileOutcome({ playerHit: false, losToPlayer: true, losAlongStep: true }) === 'fly',
  'voo livre continua'
);

if (process.exitCode) {
  console.error('\nlosPolicy tests FAILED');
  process.exit(1);
}
console.log('\nlosPolicy tests passed');
