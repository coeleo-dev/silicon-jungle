/**
 * SurvivalService — energia, integridade, overclock e game-over (A3).
 * Sem HUD: banners via emitBanner (Game liga a ui:banner).
 */
export class SurvivalService {
  constructor({
    energyDrainRate = 0.7,
    integrityDrainRate = 2.5,
    emitBanner = null,
    onGameOver = null
  } = {}) {
    this.energyDrainRate = energyDrainRate;
    this.integrityDrainRate = integrityDrainRate;
    this.emitBanner = emitBanner;
    this.onGameOver = onGameOver;
    this.dataEnergy = 100;
    this.circuitIntegrity = 100;
    this.isOverclockActive = false;
    this.overclockTimer = 0;
    this.isGameOver = false;
  }

  setDataEnergy(val) {
    this.dataEnergy = Math.min(100, Math.max(0, val));
  }

  restoreEnergy(amount) {
    this.dataEnergy = Math.min(100, this.dataEnergy + amount);
  }

  consumeEnergy(amount) {
    if (this.dataEnergy >= amount) {
      this.dataEnergy = Math.max(0, this.dataEnergy - amount);
      return true;
    }
    return false;
  }

  takeDamage(amount) {
    if (this.isGameOver) return;
    this.circuitIntegrity = Math.max(0, this.circuitIntegrity - amount);
    if (this.circuitIntegrity <= 0) {
      this.enterGameOver();
    } else if (this.circuitIntegrity < 30 && this.emitBanner) {
      this.emitBanner(
        '⚠️ ALERT: Critical integrity! Use thermal paste [H] to repair!',
        '🛡️'
      );
    }
  }

  restoreIntegrity(amount) {
    this.circuitIntegrity = Math.min(100, Math.max(0, this.circuitIntegrity + amount));
    if (this.circuitIntegrity <= 0) {
      this.enterGameOver();
    }
  }

  activateOverclock(duration) {
    this.isOverclockActive = true;
    this.overclockTimer = duration;
  }

  tickOverclock(delta) {
    if (!this.isOverclockActive) return false;
    this.overclockTimer -= delta;
    if (this.overclockTimer <= 0) {
      this.isOverclockActive = false;
      this.overclockTimer = 0;
      return true;
    }
    return false;
  }

  tick(delta) {
    if (this.isGameOver) return;
    this.dataEnergy = Math.max(0, this.dataEnergy - delta * this.energyDrainRate);
    if (this.dataEnergy <= 0) {
      this.circuitIntegrity = Math.max(0, this.circuitIntegrity - delta * this.integrityDrainRate);
      if (this.circuitIntegrity <= 0) {
        this.enterGameOver();
      }
    }
  }

  enterGameOver() {
    if (this.isGameOver) return false;
    this.isGameOver = true;
    this.circuitIntegrity = 0;
    this.isOverclockActive = false;
    this.overclockTimer = 0;
    if (this.onGameOver) this.onGameOver();
    return true;
  }

  resetForRespawn() {
    this.isGameOver = false;
    this.dataEnergy = 100;
    this.circuitIntegrity = 100;
    this.isOverclockActive = false;
    this.overclockTimer = 0;
  }

  applySavedStats({ dataEnergy, circuitIntegrity } = {}) {
    this.dataEnergy = dataEnergy ?? 100;
    this.circuitIntegrity = circuitIntegrity ?? 100;
    this.isGameOver = false;
  }
}
