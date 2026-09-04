/**
 * StunnedState — Estado Atordoado / Imobilizado da IA
 */
import { EnemyState } from './EnemyState.js?v=20260821';

export class StunnedState extends EnemyState {
  constructor() {
    super('STUNNED');
  }

  update(enemy, delta, time, ctx) {
    if (enemy.stunTimer > 0) {
      enemy.stunTimer -= delta;
      if (enemy.stunTimer <= 0) {
        enemy.setState('PATROL');
      }
    } else {
      enemy.setState('PATROL');
    }
  }
}
