/**
 * Helpers de sombra por distância — corta casters distantes sem mudar o visual perto do jogador.
 */
import { quality } from '../config/quality.js?v=20260827';

export function shadowCasterMaxDist() {
  return quality.shadowCasterDistance ?? 48;
}

export function shadowCasterMaxDistSq() {
  const d = shadowCasterMaxDist();
  return d * d;
}

export function shouldCastShadowAt(distSq, opts = {}) {
  if (opts.never) return false;
  if (opts.alwaysNear && distSq <= shadowCasterMaxDistSq()) return true;
  return distSq <= shadowCasterMaxDistSq();
}

export function bushCastsShadow() {
  return !!quality.bushCastShadow;
}
