/**
 * EntityRegistry — Registro Central e Consultas Espaciais de Entidades
 * Gerencia o ciclo de vida, indexação por tipo e consultas espaciais O(N).
 */
export class EntityRegistry {
  #entities = new Map(); // id -> BaseEntity
  #byType = new Map();   // type -> Set<BaseEntity>

  /**
   * Registra uma nova entidade no sistema
   * @param {Object} entity Instância da entidade
   * @returns {Object} A entidade registrada
   */
  register(entity) {
    if (!entity || !entity.id) {
      console.warn('[EntityRegistry] Tentativa de registrar entidade inválida sem ID:', entity);
      return entity;
    }

    this.#entities.set(entity.id, entity);

    const type = entity.type || 'unknown';
    if (!this.#byType.has(type)) {
      this.#byType.set(type, new Set());
    }
    this.#byType.get(type).add(entity);

    return entity;
  }

  /**
   * Remove uma entidade do registro
   * @param {Object} entity Instância ou ID da entidade
   */
  unregister(entity) {
    const id = typeof entity === 'string' ? entity : entity?.id;
    if (!id || !this.#entities.has(id)) return;

    const instance = this.#entities.get(id);
    this.#entities.delete(id);

    const type = instance.type || 'unknown';
    const typeSet = this.#byType.get(type);
    if (typeSet) {
      typeSet.delete(instance);
      if (typeSet.size === 0) {
        this.#byType.delete(type);
      }
    }
  }

  /**
   * Retorna uma entidade por seu ID
   * @param {string} id
   * @returns {Object|null}
   */
  getById(id) {
    return this.#entities.get(id) || null;
  }

  /**
   * Retorna todas as entidades de um tipo específico
   * @param {string} type
   * @returns {Array}
   */
  getByType(type) {
    const set = this.#byType.get(type);
    return set ? Array.from(set) : [];
  }

  /**
   * Retorna todas as entidades ativas (vivas)
   * @returns {Array}
   */
  getAlive() {
    const alive = [];
    for (const entity of this.#entities.values()) {
      if (!entity.isDead) {
        alive.push(entity);
      }
    }
    return alive;
  }

  /**
   * Retorna entidades vivas de um tipo específico
   * @param {string} type
   * @returns {Array}
   */
  getAliveByType(type) {
    const set = this.#byType.get(type);
    if (!set) return [];
    const alive = [];
    for (const entity of set) {
      if (!entity.isDead) {
        alive.push(entity);
      }
    }
    return alive;
  }

  /**
   * Retorna todas as entidades dentro de um raio de alcance
   * @param {THREE.Vector3|Object} position Posição central de busca {x, y, z}
   * @param {number} radius Raio máximo em metros
   * @param {string|null} typeFilter Filtro opcional por tipo de entidade
   * @returns {Array} Entidades no raio
   */
  getNearby(position, radius, typeFilter = null) {
    const radiusSq = radius * radius;
    const results = [];
    const candidates = typeFilter ? this.getAliveByType(typeFilter) : this.getAlive();

    for (let i = 0; i < candidates.length; i++) {
      const e = candidates[i];
      const pos = e.position || e.group?.position;
      if (!pos) continue;

      const dx = pos.x - position.x;
      const dy = (pos.y !== undefined && position.y !== undefined) ? (pos.y - position.y) : 0;
      const dz = pos.z - position.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= radiusSq) {
        results.push(e);
      }
    }

    return results;
  }

  /**
   * Inimigos hostis no raio (tag `hostile`), independente do type.
   */
  getNearbyEnemies(position, radius) {
    const radiusSq = radius * radius;
    const results = [];
    for (const e of this.#entities.values()) {
      if (e.isDead) continue;
      if (!e.tags?.has('hostile')) continue;
      const pos = e.position || e.group?.position;
      if (!pos) continue;
      const dx = pos.x - position.x;
      const dz = pos.z - position.z;
      if (dx * dx + dz * dz <= radiusSq) results.push(e);
    }
    return results;
  }

  #frameCount = 0;

  /**
   * Executa o update com Distance-Based LOD de todas as entidades vivas
   * @param {number} delta Tempo transcorrido no frame
   * @param {number} time Tempo total da simulação
   * @param {Object} ctx Contexto do jogo (PlayerController)
   */
  updateAll(delta, time, ctx) {
    this.#frameCount++;
    const playerPos = ctx?.camera?.position || ctx?.position;

    for (const entity of this.#entities.values()) {
      if (!entity.isDead && typeof entity.update === 'function') {
        try {
          // Entidades essenciais (Companheiro, NPCs próximos) sempre rodam a taxa máxima
          if (!playerPos || entity.type === 'companion' || entity.type === 'capdog' || entity.type === 'player') {
            entity.update(delta, time, ctx);
            continue;
          }

          const pos = entity.position || entity.group?.position;
          if (!pos) {
            entity.update(delta, time, ctx);
            continue;
          }

          const dx = pos.x - playerPos.x;
          const dz = pos.z - playerPos.z;
          const distSq = dx * dx + dz * dz;
          entity._updateLod = distSq < 2500 ? 0 : distSq < 10000 ? 1 : 2;
          if (typeof entity.applyRenderLod === 'function') {
            entity.applyRenderLod(distSq);
          }

          // LOD 0 (< 50m): Taxa máxima (todos os frames)
          if (distSq < 2500) {
            entity.update(delta, time, ctx);
          }
          // LOD 1 (50m - 100m): Atualização alternada a cada 2 frames com compensação de delta
          else if (distSq < 10000) {
            if ((this.#frameCount + (entity.id.length || 0)) % 2 === 0) {
              entity.update(delta * 2, time, ctx);
            }
          }
          // LOD 2 (> 100m): Atualização leve a cada 4 frames
          else {
            if ((this.#frameCount + (entity.id.length || 0)) % 4 === 0) {
              entity.update(delta * 4, time, ctx);
            }
          }
        } catch (err) {
          console.error(`[EntityRegistry] Erro no update da entidade ${entity.id} (${entity.type}):`, err);
        }
      }
    }
  }

  /**
   * Limpa todas as entidades registradas
   */
  clear() {
    this.#entities.clear();
    this.#byType.clear();
    this.#frameCount = 0;
  }
}

export const entityRegistry = new EntityRegistry();
