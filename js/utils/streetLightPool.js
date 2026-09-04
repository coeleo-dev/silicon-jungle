/**
 * Pool de PointLights de poste: no máximo N visíveis (as mais próximas da câmera).
 * Manter o número constante evita recompilar o shader forward do Three.js.
 */
export const MAX_ACTIVE_STREET_LIGHTS = 4;

function xzOf(item) {
  return item.pos || item;
}

/**
 * @param {Array<{x?:number,z?:number,pos?:{x:number,z:number}}>} items
 * @param {{x:number,z:number}|null} cameraPos
 * @param {number} [maxActive]
 * @returns {number[]}
 */
export function pickNearestStreetLightIndices(items, cameraPos, maxActive = MAX_ACTIVE_STREET_LIGHTS) {
  const n = items.length;
  if (n === 0) return [];
  const k = Math.min(maxActive, n);
  if (!cameraPos) {
    const first = [];
    for (let i = 0; i < k; i++) first.push(i);
    return first;
  }

  const chosen = [];
  const used = new Uint8Array(n);
  for (let c = 0; c < k; c++) {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      const p = xzOf(items[i]);
      const dx = p.x - cameraPos.x;
      const dz = p.z - cameraPos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best < 0) break;
    used[best] = 1;
    chosen.push(best);
  }
  return chosen;
}
