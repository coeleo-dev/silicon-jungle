/**
 * Identidade de tiro por arma (projéteis visíveis). Testável sem THREE.
 */
export function burstCount(weapon) {
  return weapon?.BURST_COUNT ?? 1;
}

export function splashRadius(weapon) {
  return weapon?.SPLASH_RADIUS ?? 0;
}

export function hitRadius(weapon) {
  return weapon?.HIT_RADIUS ?? 2.0;
}

export function cameraKick(weapon) {
  return weapon?.CAMERA_KICK ?? 0;
}

export function feelsDistinct(a, b) {
  if (!a || !b) return false;
  return (
    burstCount(a) !== burstCount(b) ||
    splashRadius(a) !== splashRadius(b) ||
    (a.COOLDOWN || 0) !== (b.COOLDOWN || 0) ||
    (a.SPREAD || 0) !== (b.SPREAD || 0) ||
    (a.PELLETS || 1) !== (b.PELLETS || 1)
  );
}
