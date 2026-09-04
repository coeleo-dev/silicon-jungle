/**
 * collision.js — Motor de Detecção de Colisão de Alta Performance com Spatial Hash Grid 2D
 * Suporta pisos sólidos de edifícios, auto-step para escadarias e calçadas, paredes perimetrais e linha de visão (Raycast LOS).
 */
import { CONFIG } from '../config/constants.js?v=20260821';
import { getTerrainHeight } from '../world/terrain.js?v=20260824';
import { isSlabInFootBand, isBoxTopWalkable } from './floorBand.js?v=20260821';
import { isLineOfSightClear } from './losMath.js?v=20260821';
import { isInsideDoorway, shouldSkipWallInDoorway } from '../world/structures/buildings/buildingColliders.js?v=20260821';

export const colliders = [];

// Tamanho da célula da grade espacial em metros (16x16m garante testes em O(1))
const CELL_SIZE = 16;
const spatialGrid = new Map();

function getCellKey(cx, cz) {
  return `${cx}_${cz}`;
}

/**
 * Adiciona um colisor indexando-o nas células correspondentes do Spatial Hash Grid
 */
export function addCollider(collider) {
  if (collider.type === 'cylinder' || collider.type === 'cyl') {
    collider.type = 'cylinder';
  }
  colliders.push(collider);

  if (collider.type === 'box') {
    const minCellX = Math.floor(collider.box.min.x / CELL_SIZE);
    const maxCellX = Math.floor(collider.box.max.x / CELL_SIZE);
    const minCellZ = Math.floor(collider.box.min.z / CELL_SIZE);
    const maxCellZ = Math.floor(collider.box.max.z / CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = getCellKey(cx, cz);
        if (!spatialGrid.has(key)) spatialGrid.set(key, []);
        spatialGrid.get(key).push(collider);
      }
    }
  } else if (collider.type === 'floor' || collider.type === 'doorway') {
    const minCellX = Math.floor(collider.minX / CELL_SIZE);
    const maxCellX = Math.floor(collider.maxX / CELL_SIZE);
    const minCellZ = Math.floor(collider.minZ / CELL_SIZE);
    const maxCellZ = Math.floor(collider.maxZ / CELL_SIZE);

    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cz = minCellZ; cz <= maxCellZ; cz++) {
        const key = getCellKey(cx, cz);
        if (!spatialGrid.has(key)) spatialGrid.set(key, []);
        spatialGrid.get(key).push(collider);
      }
    }
  } else if (collider.type === 'cylinder' || collider.type === 'cyl') {
    const cx = collider.center.x !== undefined ? collider.center.x : collider.center[0];
    const cz = collider.center.z !== undefined ? collider.center.z : collider.center[2];
    const r = collider.radius;

    const minCellX = Math.floor((cx - r) / CELL_SIZE);
    const maxCellX = Math.floor((cx + r) / CELL_SIZE);
    const minCellZ = Math.floor((cz - r) / CELL_SIZE);
    const maxCellZ = Math.floor((cz + r) / CELL_SIZE);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let z = minCellZ; z <= maxCellZ; z++) {
        const key = getCellKey(x, z);
        if (!spatialGrid.has(key)) spatialGrid.set(key, []);
        spatialGrid.get(key).push(collider);
      }
    }
  }
}

/**
 * Consulta em O(1) apenas os colisores das células vizinhas ao redor de (x, z)
 */
export function getNearbyColliders(x, z, searchRadius = 3.0) {
  const minCellX = Math.floor((x - searchRadius) / CELL_SIZE);
  const maxCellX = Math.floor((x + searchRadius) / CELL_SIZE);
  const minCellZ = Math.floor((z - searchRadius) / CELL_SIZE);
  const maxCellZ = Math.floor((z + searchRadius) / CELL_SIZE);

  const nearby = [];
  const visited = new Set();

  for (let cx = minCellX; cx <= maxCellX; cx++) {
    for (let cz = minCellZ; cz <= maxCellZ; cz++) {
      const key = getCellKey(cx, cz);
      const list = spatialGrid.get(key);
      if (list) {
        for (let i = 0; i < list.length; i++) {
          const col = list[i];
          if (!visited.has(col)) {
            visited.add(col);
            nearby.push(col);
          }
        }
      }
    }
  }
  return nearby;
}

/**
 * Checagem de colisão para o Jogador com suporte a Auto-Step para degraus e calçadas
 */
export function checkPlayerCollisions(newPos, currentCameraY) {
  const bounds = CONFIG.WORLD.BOUNDS;
  newPos.x = Math.max(-bounds, Math.min(bounds, newPos.x));
  newPos.z = Math.max(-bounds, Math.min(bounds, newPos.z));

  const playerRadius = CONFIG.PLAYER.RADIUS;
  const eyeHeight = CONFIG.PLAYER.EYE_HEIGHT;
  const currentFootY = currentCameraY - eyeHeight;
  const terrainH = getTerrainHeight(newPos.x, newPos.z);
  let activeFloorHeight = terrainH + eyeHeight;

  const nearby = getNearbyColliders(newPos.x, newPos.z, 3.5);

  let inDoorway = false;
  for (let d = 0; d < nearby.length; d++) {
    const door = nearby[d];
    if (door.type === 'doorway' && isInsideDoorway(newPos.x, currentCameraY, newPos.z, door)) {
      inDoorway = true;
      break;
    }
  }

  // 1. Lajes: só o piso na faixa dos pés (não o mais alto de todo o XZ)
  for (let i = 0; i < nearby.length; i++) {
    const col = nearby[i];
    if (col.type === 'floor') {
      if (newPos.x >= col.minX && newPos.x <= col.maxX &&
          newPos.z >= col.minZ && newPos.z <= col.maxZ &&
          isSlabInFootBand(col.y, currentFootY)) {
        const floorPlatformHeight = col.y + eyeHeight;
        if (floorPlatformHeight > activeFloorHeight) {
          activeFloorHeight = floorPlatformHeight;
        }
      }
    }
  }

  // 2. Checagem de Paredes e Obstáculos Sólidos
  for (let i = 0; i < nearby.length; i++) {
    const col = nearby[i];
    if (col.type === 'box') {
      const minX = col.box.min.x - playerRadius;
      const maxX = col.box.max.x + playerRadius;
      const minZ = col.box.min.z - playerRadius;
      const maxZ = col.box.max.z + playerRadius;
      const minY = col.box.min.y;
      const maxY = col.box.max.y;

      if (newPos.x >= minX && newPos.x <= maxX &&
          newPos.z >= minZ && newPos.z <= maxZ) {
        
        // Auto-Step: Obstáculos baixos e degraus consecutivos (<= 0.50m acima dos pés) elevam o piso
        const stepDelta = maxY - currentFootY;
        if (stepDelta >= -0.2 && stepDelta <= 0.50 && currentCameraY >= minY - 0.6) {
          if (maxY + eyeHeight > activeFloorHeight) {
            activeFloorHeight = maxY + eyeHeight;
          }
          continue;
        }

        // Topo de caixa só é chão se o topo estiver na faixa dos pés
        // (evita teleportar para um lance 3.5m abaixo no mesmo XZ)
        if (currentCameraY >= maxY + eyeHeight - 0.45 && isBoxTopWalkable(maxY, currentFootY)) {
          if (maxY + eyeHeight > activeFloorHeight) {
            activeFloorHeight = maxY + eyeHeight;
          }
          continue;
        }

        // Colisão lateral com parede vertical alta
        if (currentCameraY >= minY && currentCameraY <= maxY + eyeHeight) {
          if (shouldSkipWallInDoorway(inDoorway, minY, maxY, currentFootY)) {
            continue;
          }
          return { collide: true, floorHeight: activeFloorHeight, obstacle: col };
        }
      }
    } else if (col.type === 'cylinder' || col.type === 'cyl') {
      const cx = col.center.x !== undefined ? col.center.x : col.center[0];
      const cz = col.center.z !== undefined ? col.center.z : col.center[2];
      const dx = newPos.x - cx;
      const dz = newPos.z - cz;
      const distSq = dx * dx + dz * dz;
      const minDist = col.radius + playerRadius;

      if (distSq < minDist * minDist) {
        return { collide: true, floorHeight: activeFloorHeight, obstacle: col };
      }
    }
  }

  return { collide: false, floorHeight: activeFloorHeight };
}

/**
 * Checagem de colisão para Inimigos com Spatial Hash Grid (ignora calçadas e degraus baixos)
 */
export function checkEnemyCollisions(pos, enemyRadius = 0.6) {
  const bounds = CONFIG.WORLD.BOUNDS - 2;
  pos.x = Math.max(-bounds, Math.min(bounds, pos.x));
  pos.z = Math.max(-bounds, Math.min(bounds, pos.z));

  const terrainH = getTerrainHeight(pos.x, pos.z);
  const nearby = getNearbyColliders(pos.x, pos.z, 2.5);

  let inDoorway = false;
  const enemyEyeY = pos.y !== undefined ? pos.y + 1.2 : terrainH + 1.2;
  for (let d = 0; d < nearby.length; d++) {
    const door = nearby[d];
    if (door.type === 'doorway' && isInsideDoorway(pos.x, enemyEyeY, pos.z, door)) {
      inDoorway = true;
      break;
    }
  }

  for (let i = 0; i < nearby.length; i++) {
    const col = nearby[i];
    if (col.type === 'box') {
      const minX = col.box.min.x - enemyRadius;
      const maxX = col.box.max.x + enemyRadius;
      const minZ = col.box.min.z - enemyRadius;
      const maxZ = col.box.max.z + enemyRadius;

      // Obstáculos baixos (calçadas, degraus <= 0.60m) não bloqueiam inimigos
      const heightAboveGround = col.box.max.y - terrainH;
      if (heightAboveGround <= 0.60) {
        continue;
      }

      if (pos.x >= minX && pos.x <= maxX &&
          pos.z >= minZ && pos.z <= maxZ) {
        if (shouldSkipWallInDoorway(inDoorway, col.box.min.y, col.box.max.y, terrainH)) {
          continue;
        }
        return true;
      }
    } else if (col.type === 'cylinder' || col.type === 'cyl') {
      const cx = col.center.x !== undefined ? col.center.x : col.center[0];
      const cz = col.center.z !== undefined ? col.center.z : col.center[2];
      const dx = pos.x - cx;
      const dz = pos.z - cz;
      const minDist = col.radius + enemyRadius;
      if (dx * dx + dz * dz < minDist * minDist) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checa linha de visão direta entre dois pontos 3D contra boxes, cilindros e lajes.
 */
export function hasLineOfSight(p1, p2) {
  const p1Vec = p1.isVector3 ? p1 : new THREE.Vector3(p1.x, p1.y, p1.z);
  const p2Vec = p2.isVector3 ? p2 : new THREE.Vector3(p2.x, p2.y, p2.z);

  const dx = p2Vec.x - p1Vec.x;
  const dy = p2Vec.y - p1Vec.y;
  const dz = p2Vec.z - p1Vec.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < 0.001) return true;

  const midX = (p1Vec.x + p2Vec.x) / 2;
  const midZ = (p1Vec.z + p2Vec.z) / 2;
  const nearby = getNearbyColliders(midX, midZ, dist / 2 + 2);
  return isLineOfSightClear(p1Vec, p2Vec, nearby);
}

function rebuildSpatialGrid() {
  spatialGrid.clear();
  const keep = colliders.slice();
  colliders.length = 0;
  for (let i = 0; i < keep.length; i++) addCollider(keep[i]);
}

/**
 * Remove um colisor (por referência ou `_buildId`) e reconstrói o spatial hash.
 */
export function removeCollider(col) {
  if (!col) return;
  const id = col._buildId;
  for (let i = colliders.length - 1; i >= 0; i--) {
    const c = colliders[i];
    if (c === col || (id != null && c._buildId === id)) colliders.splice(i, 1);
  }
  rebuildSpatialGrid();
}

/**
 * Remove colisores de um chunk e reconstrói o spatial hash.
 */
export function removeCollidersByChunkKey(key) {
  if (!key) return;
  for (let i = colliders.length - 1; i >= 0; i--) {
    if (colliders[i]._chunkKey === key) colliders.splice(i, 1);
  }
  rebuildSpatialGrid();
}
