import { EnemyState } from './EnemyState.js?v=20260821';
import { camera } from '../../core/scene.js?v=20260821';

export class ChaseState extends EnemyState {
  constructor() {
    super('CHASE');
  }

  update(enemy, delta, time, ctx) {
    const playerPos = ctx?.playerPos || ctx?.camera?.position || (typeof camera !== 'undefined' ? camera.position : null);
    if (!playerPos) {
      enemy.setState('PATROL');
      return;
    }

    const distToPlayer = enemy.distanceTo(playerPos);
    if (distToPlayer > enemy.leashRange) {
      enemy.setState('PATROL');
      return;
    }

    if (typeof enemy.chase === 'function') {
      enemy.chase(delta, playerPos, distToPlayer, ctx);
    }
  }
}
