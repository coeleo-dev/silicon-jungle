/**
 * Bloqueia disparo no gesto do pointer lock e mousedown repetido (tiro automático).
 */
export const ATTACK_LOCK_GRACE_MS = 350;

export function shouldAcceptAttack({
  isLocked,
  now,
  lockGrantedAt,
  graceMs = ATTACK_LOCK_GRACE_MS,
  buildMode = false
}) {
  if (buildMode) return false;
  if (!isLocked) return false;
  if (!lockGrantedAt) return false;
  return now - lockGrantedAt >= graceMs;
}

export function createAttackInputState() {
  return { primaryHeld: false, ignoreUntilRelease: false };
}

export function onAttackPointerLock(state) {
  return {
    primaryHeld: state.primaryHeld,
    ignoreUntilRelease: state.primaryHeld
  };
}

export function onAttackButtonUp(state) {
  return { primaryHeld: false, ignoreUntilRelease: false };
}

export function onAttackButtonDown(state) {
  if (state.primaryHeld) {
    return { state, shouldFire: false };
  }
  const next = {
    primaryHeld: true,
    ignoreUntilRelease: state.ignoreUntilRelease
  };
  if (state.ignoreUntilRelease) {
    return { state: next, shouldFire: false };
  }
  return { state: next, shouldFire: true };
}
