/**
 * CombatSystem — Fachada Principal do Sistema de Combate
 * Orquestra projéteis, combate corpo a corpo, varredura balística e resolução de dano.
 */
import { projectileManager } from './ProjectileManager.js?v=20260824';
import { damageResolver } from './DamageResolver.js?v=20260821';

export class CombatSystem {
  constructor() {
    this.projectiles = projectileManager;
    this.damageResolver = damageResolver;
  }

  /**
   * Registra um novo projétil em voo
   */
  fireProjectile(config) {
    return this.projectiles.spawn(config);
  }

  /**
   * Executa golpe físico corpo a corpo (ex: Faca de Circuito)
   */
  handleMelee(origin, range, damage, gameContext = null) {
    return this.damageResolver.resolveMelee(origin, range, damage, gameContext);
  }

  /**
   * Atualização frame a frame do sistema de combate
   */
  update(delta, ctx) {
    this.projectiles.update(delta, ctx);
  }

  /**
   * Retorna os projéteis ativos
   */
  get activeProjectiles() {
    return this.projectiles.activeProjectiles;
  }
}

export const combatSystem = new CombatSystem();
