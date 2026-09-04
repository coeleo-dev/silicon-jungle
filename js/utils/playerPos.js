/**
 * Resolve a posição do jogador no update das entidades.
 * O loop passa o PlayerController como ctx — ele precisa expor playerPos/camera,
 * senão o fallback é a câmera da cena.
 */
export function resolvePlayerPos(ctx, fallbackCamera = null) {
  if (ctx?.playerPos) return ctx.playerPos;
  if (ctx?.camera?.position) return ctx.camera.position;
  if (fallbackCamera?.position) return fallbackCamera.position;
  return null;
}
