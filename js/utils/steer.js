/**
 * Desvio de obstáculo com sensores angulares (perseguição / follow do Capdog).
 */

const SENSOR_ANGLES = [0, 0.6, -0.6, 1.2, -1.2, Math.PI / 2, -Math.PI / 2];

/**
 * @param {number} fromX
 * @param {number} fromZ
 * @param {number} toX
 * @param {number} toZ
 * @param {(dx: number, dz: number) => boolean} isBlocked  true se o passo na direção unitária bate
 * @returns {{ dx: number, dz: number, blocked: boolean }} direção unitária XZ
 */
export function pickSteerDir(fromX, fromZ, toX, toZ, isBlocked) {
  const vx = toX - fromX;
  const vz = toZ - fromZ;
  const len = Math.hypot(vx, vz);
  if (len < 1e-6) return { dx: 0, dz: 0, blocked: true };

  const fx = vx / len;
  const fz = vz / len;

  for (let i = 0; i < SENSOR_ANGLES.length; i++) {
    const a = SENSOR_ANGLES[i];
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = fx * c - fz * s;
    const dz = fx * s + fz * c;
    if (!isBlocked(dx, dz)) {
      return { dx, dz, blocked: false };
    }
  }

  return { dx: fx, dz: fz, blocked: true };
}

/** Yaw Three.js (Y) para um modelo cujo focinho aponta +Z. */
export function headingFromXZ(dx, dz) {
  return Math.atan2(dx, dz);
}

/** Interpola ângulo pelo caminho curto (evita giro brusco / passo de lado). */
export function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * Math.min(1, Math.max(0, t));
}
