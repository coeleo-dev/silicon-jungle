/**
 * PatrolState — Estado de Patrulha Circular da IA
 */
import { EnemyState } from './EnemyState.js?v=20260821';
import { camera } from '../../core/scene.js?v=20260821';

export class PatrolState extends EnemyState {
  constructor() {
    super('PATROL');
  }

  update(enemy, delta, time, ctx) {
    if (typeof enemy.patrol === 'function') {
      enemy.patrol(delta);
    }

    // Transição para CHASE se jogador estiver próximo
    const playerPos = ctx?.playerPos || ctx?.camera?.position || (typeof camera !== 'undefined' ? camera.position : null);
    if (playerPos) {
      const dist = enemy.distanceTo(playerPos);
      if (dist < enemy.aggroRange) {
        enemy.setState('CHASE');
      }
    }
  }
}
