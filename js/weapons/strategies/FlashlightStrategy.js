/**
 * FlashlightStrategy — Estratégia de Iluminação Tática Portátil
 */
import { audioService } from '../../core/AudioService.js?v=20260821';
import { showBanner } from '../../ui/hud.js?v=20260912';

export class FlashlightStrategy {
  constructor(weaponSystem) {
    this.weaponSystem = weaponSystem;
  }

  get cooldown() {
    return 0.15;
  }

  get attackTimerDuration() {
    return 0;
  }

  execute(gameContext = null) {
    const active = this.weaponSystem.toggleFlashlight();
    audioService.flashlightClick();
    showBanner(`LED flashlight ${active ? 'ON' : 'OFF'}`, '🔦');
  }
}
