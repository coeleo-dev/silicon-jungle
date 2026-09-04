/**
 * Tempestade (P23/P24) — rolls puros, sem Three.js.
 * Sem import de worldClock (evita segundo singleton ?v= no browser).
 */

export const STORM_STRIKE_RADIUS = 10;
export const STORM_STRIKE_DAMAGE = 4;
export const STORM_KNOCKBACK = 2.6;
export const STORM_ROLL_SECONDS = 8;

let rollAcc = 0;
let stormElapsed = 0;
let stormDuration = 22;
let nextFlash = 2;

export function resetStormMachine() {
  rollAcc = 0;
  stormElapsed = 0;
  stormDuration = 22;
  nextFlash = 2;
}

export function stormStartChance(isNightNow) {
  return isNightNow ? 0.18 : 0.05;
}

export function tickStormMachine(delta, clock, rng = Math.random) {
  if (clock.storm) {
    stormElapsed += delta;
    if (stormElapsed >= stormDuration) {
      clock.storm = false;
      stormElapsed = 0;
    }
    return clock.storm;
  }
  rollAcc += delta;
  if (rollAcc >= STORM_ROLL_SECONDS) {
    rollAcc = 0;
    if (rng() < stormStartChance(clock.timeOfDay > 0.78 || clock.timeOfDay < 0.22)) {
      clock.storm = true;
      stormDuration = 18 + rng() * 12;
      stormElapsed = 0;
    }
  }
  return clock.storm;
}

export function setStormEnabled(clock, on) {
  clock.storm = !!on;
  if (!on) stormElapsed = 0;
}

export function tickLightningBolt(delta, storm, rng = Math.random) {
  if (!storm) {
    nextFlash = 1.5 + rng() * 2;
    return null;
  }
  nextFlash -= delta;
  if (nextFlash <= 0) {
    nextFlash = 1.4 + rng() * 3.2;
    return {
      ox: (rng() - 0.5) * 36,
      oz: (rng() - 0.5) * 36
    };
  }
  return null;
}

export function strikeHitsPlayer(px, pz, sx, sz, radius = STORM_STRIKE_RADIUS) {
  return Math.hypot(px - sx, pz - sz) < radius;
}
