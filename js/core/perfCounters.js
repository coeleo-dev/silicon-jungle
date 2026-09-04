/**
 * Contadores de renderer.info para ?perf=1 (sem Three/DOM).
 */
export function ensurePerfCounters(renderer) {
  if (renderer && renderer.info) renderer.info.autoReset = true;
}
