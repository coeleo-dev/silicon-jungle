/**
 * SpatialExclusionService.js — Motor Central de Zoneamento e Prevenção de Sobreposição Espacial
 * Gerencia zonas de exclusão, recuos de segurança e consultas de colisão O(1) via Spatial Hashing Grid.
 */
import { findClearSpawn } from '../world/spawnPlacement.js?v=20260821';

export class SpatialExclusionService {
  constructor() {
    this.zones = []; // Lista de todas as zonas registradas
    this.gridCellSize = 16.0; // Tamanho da célula do spatial grid em metros
    this.grid = new Map(); // "cellX_cellZ" -> Array<Zone>
  }

  /**
   * Limpa todos os registros do serviço
   */
  clear() {
    this.zones = [];
    this.grid.clear();
  }

  #getGridKey(gx, gz) {
    return `${gx}_${gz}`;
  }

  #addToGrid(zone, minX, maxX, minZ, maxZ) {
    const minGX = Math.floor(minX / this.gridCellSize);
    const maxGX = Math.floor(maxX / this.gridCellSize);
    const minGZ = Math.floor(minZ / this.gridCellSize);
    const maxGZ = Math.floor(maxZ / this.gridCellSize);

    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        const key = this.#getGridKey(gx, gz);
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key).push(zone);
      }
    }
  }

  /**
   * Registra um edifício com rotação e margem de recuo (clearance)
   */
  registerBuilding(id, x, z, width, depth, rotation = 0, clearance = 3.5) {
    const halfW = width / 2 + clearance;
    const halfD = depth / 2 + clearance;
    const maxR = Math.hypot(halfW, halfD);

    const zone = {
      id: id || `building_${x}_${z}`,
      type: 'OBB',
      category: 'BUILDING',
      x,
      z,
      width: width + clearance * 2,
      depth: depth + clearance * 2,
      rotation,
      cosR: Math.cos(rotation),
      sinR: Math.sin(rotation),
      halfW,
      halfD,
      boundingRadius: maxR
    };

    this.zones.push(zone);
    this.#addToGrid(zone, x - maxR, x + maxR, z - maxR, z + maxR);
    return zone;
  }

  /**
   * Registra um corredor de entrada desobstruído em frente a uma porta
   */
  registerEntrance(id, x, z, width = 4.5, depth = 5.0, rotation = 0, clearance = 1.0) {
    const halfW = width / 2 + clearance;
    const halfD = depth / 2 + clearance;
    const maxR = Math.hypot(halfW, halfD);

    const zone = {
      id: id || `entrance_${x}_${z}`,
      type: 'OBB',
      category: 'ENTRANCE',
      x,
      z,
      width: width + clearance * 2,
      depth: depth + clearance * 2,
      rotation,
      cosR: Math.cos(rotation),
      sinR: Math.sin(rotation),
      halfW,
      halfD,
      boundingRadius: maxR
    };

    this.zones.push(zone);
    this.#addToGrid(zone, x - maxR, x + maxR, z - maxR, z + maxR);
    return zone;
  }

  /**
   * Registra uma pista asfáltica (Avenida)
   */
  registerRoad(id, minX, maxX, minZ, maxZ, clearance = 1.0) {
    const zone = {
      id: id || `road_${minX}_${minZ}`,
      type: 'AABB',
      category: 'ROAD',
      minX: minX - clearance,
      maxX: maxX + clearance,
      minZ: minZ - clearance,
      maxZ: maxZ + clearance
    };

    this.zones.push(zone);
    this.#addToGrid(zone, zone.minX, zone.maxX, zone.minZ, zone.maxZ);
    return zone;
  }

  /**
   * Registra uma calçada de pedestres
   */
  registerSidewalk(id, minX, maxX, minZ, maxZ, clearance = 0.5) {
    const zone = {
      id: id || `sidewalk_${minX}_${minZ}`,
      type: 'AABB',
      category: 'SIDEWALK',
      minX: minX - clearance,
      maxX: maxX + clearance,
      minZ: minZ - clearance,
      maxZ: maxZ + clearance
    };

    this.zones.push(zone);
    this.#addToGrid(zone, zone.minX, zone.maxX, zone.minZ, zone.maxZ);
    return zone;
  }

  /**
   * Registra um objeto circular (Poste, Carro, Árvore de Grande Porte, Bancada)
   */
  registerProp(id, x, z, radius = 1.5, category = 'PROP', clearance = 1.2) {
    const totalR = radius + clearance;
    const zone = {
      id: id || `prop_${x}_${z}`,
      type: 'CIRCLE',
      category,
      x,
      z,
      radius: totalR
    };

    this.zones.push(zone);
    this.#addToGrid(zone, x - totalR, x + totalR, z - totalR, z + totalR);
    return zone;
  }

  /**
   * Registra uma zona segura (Vila inicial, praça central)
   */
  registerSafeZone(id, x = 0, z = 0, radius = 22.0) {
    const zone = {
      id: id || `safe_zone_${x}_${z}`,
      type: 'CIRCLE',
      category: 'SAFE_ZONE',
      x,
      z,
      radius
    };

    this.zones.push(zone);
    this.#addToGrid(zone, x - radius, x + radius, z - radius, z + radius);
    return zone;
  }

  /**
   * Obtém todas as zonas vizinhas a uma coordenada usando o Spatial Hash Grid
   */
  #getPotentialZones(x, z, queryRadius = 1.0) {
    const minGX = Math.floor((x - queryRadius) / this.gridCellSize);
    const maxGX = Math.floor((x + queryRadius) / this.gridCellSize);
    const minGZ = Math.floor((z - queryRadius) / this.gridCellSize);
    const maxGZ = Math.floor((z + queryRadius) / this.gridCellSize);

    const candidates = new Set();
    for (let gx = minGX; gx <= maxGX; gx++) {
      for (let gz = minGZ; gz <= maxGZ; gz++) {
        const key = this.#getGridKey(gx, gz);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            candidates.add(cell[i]);
          }
        }
      }
    }
    return candidates;
  }

  /**
   * Verifica se uma posição (x, z) com determinado raio está livre de sobreposição
   * @param {number} x
   * @param {number} z
   * @param {number} radius Raio do objeto a ser inserido
   * @param {string[]} [ignoredCategories=[]] Categorias de exclusão a ignorar na consulta
   * @returns {boolean} true se o espaço estiver 100% livre
   */
  isAvailable(x, z, radius = 0.5, ignoredCategories = []) {
    const candidates = this.#getPotentialZones(x, z, radius);

    for (const zone of candidates) {
      if (ignoredCategories.length > 0 && ignoredCategories.includes(zone.category)) {
        continue;
      }

      if (zone.type === 'CIRCLE') {
        const dx = x - zone.x;
        const dz = z - zone.z;
        const distSq = dx * dx + dz * dz;
        const minDist = zone.radius + radius;
        if (distSq < minDist * minDist) {
          return false;
        }
      } else if (zone.type === 'AABB') {
        if (x + radius >= zone.minX && x - radius <= zone.maxX &&
            z + radius >= zone.minZ && z - radius <= zone.maxZ) {
          return false;
        }
      } else if (zone.type === 'OBB') {
        // Transformar ponto para o espaço local do OBB
        const dx = x - zone.x;
        const dz = z - zone.z;

        // Rotação inversa
        const localX = dx * zone.cosR + dz * zone.sinR;
        const localZ = -dx * zone.sinR + dz * zone.cosR;

        if (Math.abs(localX) <= zone.halfW + radius &&
            Math.abs(localZ) <= zone.halfD + radius) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Encontra a posição livre válida mais próxima em caso de leve colisão
   */
  findNearestValidPosition(targetX, targetZ, radius = 0.6, maxDistance = 6.0, ignoredCategories = []) {
    return findClearSpawn(targetX, targetZ, {
      radius,
      maxDistance,
      ringStep: 1.0,
      isClear: (x, z, r) => this.isAvailable(x, z, r, ignoredCategories),
      fallback: { x: 0, z: 18 }
    });
  }
}

export const spatialExclusionService = new SpatialExclusionService();
