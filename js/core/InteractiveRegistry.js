/**
 * InteractiveRegistry — Registro Central e Encapsulado de Objetos Interativos
 * Substitui arrays globais mutáveis, fornecendo métodos seguros de registro, remoção e consulta.
 */
export class InteractiveRegistry {
  #objects = new Set();
  #listCache = [];
  #isCacheDirty = false;

  /**
   * Registra um objeto 3D interativo
   * @param {THREE.Object3D} obj
   */
  register(obj) {
    if (!obj) return;
    this.#objects.add(obj);
    this.#isCacheDirty = true;
  }

  /**
   * Remove um objeto 3D interativo
   * @param {THREE.Object3D} obj
   */
  unregister(obj) {
    if (!obj) return;
    this.#objects.delete(obj);
    this.#isCacheDirty = true;
  }

  /**
   * Retorna a lista de todos os objetos interativos ativos
   * @returns {Array<THREE.Object3D>}
   */
  getAll() {
    if (this.#isCacheDirty) {
      this.#listCache = Array.from(this.#objects);
      this.#isCacheDirty = false;
    }
    return this.#listCache;
  }

  /**
   * Retorna objetos interativos dentro de um raio de distância
   * @param {THREE.Vector3} center
   * @param {number} maxDist
   * @returns {Array<THREE.Object3D>}
   */
  getNearby(center, maxDist = 15.0) {
    const all = this.getAll();
    const maxDistSq = maxDist * maxDist;
    const nearby = [];
    const _temp = new THREE.Vector3();

    for (let i = 0; i < all.length; i++) {
      const obj = all[i];
      if (!obj.parent && !obj.visible) continue;
      obj.getWorldPosition(_temp);
      const dx = _temp.x - center.x;
      const dy = _temp.y - center.y;
      const dz = _temp.z - center.z;
      if (dx * dx + dy * dy + dz * dz <= maxDistSq) {
        nearby.push(obj);
      }
    }
    return nearby;
  }

  /**
   * Limpa todos os registros
   */
  clear() {
    this.#objects.clear();
    this.#listCache = [];
    this.#isCacheDirty = false;
  }

  get count() {
    return this.#objects.size;
  }
}

export const interactiveRegistry = new InteractiveRegistry();
