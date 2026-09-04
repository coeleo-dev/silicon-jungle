/**
 * AudioService — Fachada Defensiva e Semântica de Áudio
 * Elimina checagens repetitivas if (sound && sound.playX) através de proxy seguro com fallbacks.
 */
import { sound } from './audio.js?v=20260821';

export class AudioService {
  #engine;

  constructor(engine = sound) {
    this.#engine = engine;
  }

  init() {
    if (this.#engine && typeof this.#engine.init === 'function') {
      try {
        this.#engine.init();
        return true;
      } catch (err) {
        console.warn('[AudioService] Erro ao inicializar áudio:', err);
      }
    }
    return false;
  }

  /**
   * Executa com segurança um método de áudio se existir
   * @param {string} methodName Nome da função no sound engine
   * @param  {...any} args Argumentos adicionais
   * @returns {boolean} True se a chamada foi executada com sucesso
   */
  play(methodName, ...args) {
    if (this.#engine && typeof this.#engine[methodName] === 'function') {
      try {
        this.#engine[methodName](...args);
        return true;
      } catch (err) {
        console.warn(`[AudioService] Erro ao reproduzir "${methodName}":`, err);
      }
    }
    return false;
  }

  // --- Métodos Semânticos com Fallback Inteligente ---

  enemyHit() {
    return this.play('playEnemyHit') || this.play('playHitEnemy');
  }

  enemyDeath() {
    return this.play('playEnemyDeath') || this.play('playExplosion');
  }

  gameOver() {
    return this.play('playGameOver') || this.play('playExplosion');
  }

  collect() {
    return this.play('playCollect');
  }

  knifeSlash() {
    return this.play('playKnifeSlash');
  }

  weaponSwitch() {
    return this.play('playWeaponSwitch');
  }

  flashlightClick() {
    return this.play('playFlashlightClick');
  }

  lowEnergyAlarm() {
    return this.play('playLowEnergyAlarm');
  }

  shootLaser() {
    return this.play('playShootLaser') || this.play('playPlasmaPistolShoot');
  }

  arcShotgun() {
    return this.play('playArcShotgun') || this.play('playShotgunBlast');
  }

  busRifle() {
    return this.play('playBusRifle') || this.play('playSniperShot');
  }

  minionShoot() {
    return this.play('playMinionShoot');
  }

  webSpit() {
    return this.play('playWebSpit');
  }

  shieldDeflect() {
    return this.play('playShieldDeflect');
  }

  walkFootstep() {
    return this.play('playFootstep');
  }

  jump() {
    return this.play('playJump');
  }

  uiClick() {
    return this.play('playUIClick') || this.play('playMenuClick');
  }

  powerUp() {
    return this.play('playPowerUp') || this.play('playCollect');
  }

  coreCollect() {
    return this.play('playCoreCollect') || this.play('playCollect');
  }

  craftSuccess() {
    return this.play('playCraftSuccess') || this.play('playCollect');
  }
}

import { eventBus } from './EventBus.js?v=20260821';

export const audioService = new AudioService(sound);

// Inscrição no EventBus para desacoplamento de áudio
eventBus.on('audio:play', ({ sound, args = [] } = {}) => {
  if (typeof sound === 'string') {
    if (typeof audioService[sound] === 'function') {
      audioService[sound](...args);
    } else {
      audioService.play(sound, ...args);
    }
  }
});
eventBus.on('entity:damaged', ({ entity }) => {
  if (entity?.type === 'player') {
    audioService.play('playPlayerHurt');
  } else {
    audioService.enemyHit();
  }
});
eventBus.on('entity:killed', () => {
  audioService.enemyDeath();
});
eventBus.on('item:collected', () => {
  audioService.collect();
});
