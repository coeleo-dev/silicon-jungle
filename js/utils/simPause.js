/**
 * Pausa a simulação com overlay de início visível — inclusive antes de hasGameStarted.
 */
export function isSimPaused({ isGameOver, overlayDisplay, overlayOpacity }) {
  if (isGameOver) return true;
  if (overlayDisplay === 'none') return false;
  if (overlayOpacity === '0') return false;
  return true;
}
