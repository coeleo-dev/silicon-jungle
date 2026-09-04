/**
 * Utilitários Matemáticos Puros e Otimizados
 */

/**
 * Calcula a distância euclidiana ao quadrado entre um ponto 3D e um segmento de reta 3D
 * Fundamental para detecção contínua de colisão (Anti-tunneling) de projéteis de alta velocidade.
 * @param {THREE.Vector3|Object} p Ponto a ser testado
 * @param {THREE.Vector3|Object} v Início do segmento
 * @param {THREE.Vector3|Object} w Fim do segmento
 * @returns {number} Distância mínima ao quadrado
 */
export function distToSegmentSquared(p, v, w) {
  const l2 = (w.x - v.x) * (w.x - v.x) + (w.y - v.y) * (w.y - v.y) + (w.z - v.z) * (w.z - v.z);
  if (l2 === 0) {
    const dx = p.x - v.x;
    const dy = p.y - v.y;
    const dz = p.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y) + (p.z - v.z) * (w.z - v.z)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  const projZ = v.z + t * (w.z - v.z);

  const dx = p.x - projX;
  const dy = p.y - projY;
  const dz = p.z - projZ;
  return dx * dx + dy * dy + dz * dz;
}

/**
 * Calcula o ponto do segmento [segStart, segEnd] mais próximo de `point`
 * Usado para determinar o ponto exato de impacto de projéteis (anti-tunneling).
 * @param {THREE.Vector3} point Ponto de referência (ex.: centro do inimigo)
 * @param {THREE.Vector3} segStart Início do segmento
 * @param {THREE.Vector3} segEnd Fim do segmento
 * @param {THREE.Vector3} out Vector3 de saída (reutilizável, sem alocação)
 * @returns {THREE.Vector3} O próprio `out` preenchido com o ponto mais próximo
 */
export function closestPointOnSegment(point, segStart, segEnd, out) {
  const abx = segEnd.x - segStart.x, aby = segEnd.y - segStart.y, abz = segEnd.z - segStart.z;
  const apx = point.x - segStart.x, apy = point.y - segStart.y, apz = point.z - segStart.z;
  const lenSq = abx * abx + aby * aby + abz * abz;
  const t = lenSq > 0 ? Math.min(1, Math.max(0, (apx * abx + apy * aby + apz * abz) / lenSq)) : 0;
  out.set(segStart.x + abx * t, segStart.y + aby * t, segStart.z + abz * t);
  return out;
}

/**
 * Interpolação Linear entre dois valores
 * @param {number} a Valor inicial
 * @param {number} b Valor final
 * @param {number} t Fator de interpolação [0, 1]
 * @returns {number}
 */
export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * Limita um valor entre um mínimo e um máximo
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Retorna um número pseudo-aleatório em ponto flutuante dentro do intervalo [min, max]
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Retorna uma coordenada aleatória {x, z} dentro de um círculo de raio r centrado em (cx, cz)
 * @param {number} cx Centro X
 * @param {number} cz Centro Z
 * @param {number} radius Raio máximo
 * @returns {{ x: number, z: number }}
 */
export function randomInCircle(cx, cz, radius) {
  const r = radius * Math.sqrt(Math.random());
  const theta = Math.random() * Math.PI * 2;
  return {
    x: cx + r * Math.cos(theta),
    z: cz + r * Math.sin(theta)
  };
}
