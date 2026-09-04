/**
 * Teste de “atrás da câmera” no plano XZ (helper puro para LOD de vegetação).
 * @param {number} dx
 * @param {number} dz
 * @param {number} fwdX  forward XZ já normalizado
 * @param {number} fwdZ
 * @param {number} distSq
 * @param {number} [keepNearSq=144]  12 m — não cullar o que está aos pés
 */
export function isBehindCamera(dx, dz, fwdX, fwdZ, distSq, keepNearSq = 144) {
  if (distSq <= keepNearSq) return false;
  return dx * fwdX + dz * fwdZ < 0;
}
