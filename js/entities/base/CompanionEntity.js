/**
 * CompanionEntity — Classe Base para Mascotes e Companheiros Amigáveis
 * Gerencia inteligência de acompanhamento, assistência em combate e interações.
 */
import { BaseEntity } from './BaseEntity.js?v=20260830';
import { worldService } from '../../core/WorldService.js?v=20260821';

export class CompanionEntity extends BaseEntity {
  constructor({
    type = 'companion',
    position = { x: 0, y: 0, z: 0 },
    hp = 100,
    maxHp = 100,
    speed = 8.0,
    followDistance = 3.5,
    autoRegister = true
  } = {}) {
    super({ type, position, hp, maxHp, speed, autoRegister });

    this.isTamed = false;
    this.followDistance = followDistance;
    this.state = 'IDLE'; // IDLE, FOLLOW, ASSIST, FETCH
    this.level = 1;
  }

  /**
   * Atualização padrão do companheiro
   */
  update(delta, time, ctx) {
    if (this.isDead) return;

    if (this.isTamed) {
      const playerPos = ctx?.playerPos || ctx?.camera?.position;
      if (playerPos) {
        this.updateTamedBehavior(delta, time, playerPos, ctx);
      }
    } else {
      this.updateUntamedBehavior(delta, time, ctx);
    }

    this.updateAnimation(delta, time);
    this.alignToTerrain(worldService);
  }

  updateTamedBehavior(delta, time, playerPos, ctx) {
    // Override nas subclasses (ex: Capdog)
  }

  updateUntamedBehavior(delta, time, ctx) {
    // Override nas subclasses
  }

  updateAnimation(delta, time) {
    // Override nas subclasses
  }
}
