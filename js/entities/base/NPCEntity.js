/**
 * NPCEntity — Classe Base para Personagens Não-Jogáveis e Habitantes
 * Gerencia ciclo de vida, interações por proximidade e diálogos.
 */
import { BaseEntity } from './BaseEntity.js?v=20260830';
import { worldService } from '../../core/WorldService.js?v=20260821';

export class NPCEntity extends BaseEntity {
  constructor({
    type = 'npc',
    name = 'NPC',
    position = { x: 0, y: 0, z: 0 },
    interactDistance = 3.5,
    autoRegister = true
  } = {}) {
    super({ type, position, hp: 9999, maxHp: 9999, speed: 0, autoRegister });

    this.name = name;
    this.interactDistance = interactDistance;
    this.isInteracting = false;
  }

  /**
   * Verifica se o jogador está ao alcance de interação
   */
  canInteract(playerPos) {
    if (!playerPos) return false;
    return this.distanceTo(playerPos) <= this.interactDistance;
  }

  /**
   * Dispara a ação de interação (diálogo, crafting, etc.)
   */
  interact(ctx) {
    // Override nas subclasses
  }

  /**
   * Atualização padrão de NPC: Animação idle e alinhamento
   */
  update(delta, time, ctx) {
    this.updateIdleAnimation(delta, time);
    this.alignToTerrain(worldService);
  }

  updateIdleAnimation(delta, time) {
    // Override nas subclasses
  }
}
