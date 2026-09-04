/**
 * KnifeStrategy — Estratégia de Combate Corpo a Corpo (Faca de Circuito)
 */
import { camera } from '../../core/scene.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { combatSystem } from '../../combat/CombatSystem.js?v=20260821';
import { CONFIG } from '../../config/constants.js?v=20260821';

export class KnifeStrategy {
  constructor(config = CONFIG.WEAPONS.KNIFE) {
    this.config = config;
  }

  get cooldown() {
    return this.config.COOLDOWN;
  }

  get attackTimerDuration() {
    return 0.22;
  }

  execute(gameContext = null) {
    audioService.knifeSlash();
    combatSystem.handleMelee(camera.position, this.config.RANGE, this.config.DAMAGE, gameContext);
  }
}
