/**
 * WorldService — Fachada Unificada de Terreno, Física e Colisões
 * Encapsula o acesso aos subsistemas de terreno e colisão do mundo.
 */
import { getTerrainHeight, getTerrainNormal } from '../world/terrain.js?v=20260824';
import {
  addCollider,
  removeCollidersByChunkKey as removeCollidersByChunkKeyFn,
  checkPlayerCollisions,
  checkEnemyCollisions,
  hasLineOfSight,
  colliders
} from '../utils/collision.js?v=20260912';

export class WorldService {
  /**
   * Retorna a cota Y analítica do terreno em (X, Z)
   * @param {number} x
   * @param {number} z
   * @returns {number} Altura Y
   */
  getHeight(x, z) {
    return getTerrainHeight(x, z);
  }

  /**
   * Alias de compatibilidade para getHeight
   */
  getTerrainHeight(x, z) {
    return getTerrainHeight(x, z);
  }

  /**
   * Retorna o vetor normal 3D da superfície do terreno em (X, Z)
   * @param {number} x
   * @param {number} z
   * @returns {THREE.Vector3}
   */
  getNormal(x, z) {
    return getTerrainNormal(x, z);
  }

  /**
   * Alias de compatibilidade para getNormal
   */
  getTerrainNormal(x, z) {
    return getTerrainNormal(x, z);
  }

  /**
   * Registra um novo volume de colisão no mundo
   * @param {Object} col Objeto de colisão ({ type: 'box'|'cylinder', ... })
   */
  addCollider(col) {
    addCollider(col);
  }

  removeCollidersByChunkKey(key) {
    removeCollidersByChunkKeyFn(key);
  }

  /**
   * Retorna a lista de volumes de colisão ativos
   * @returns {Array}
   */
  get colliders() {
    return colliders;
  }

  /**
   * Executa a checagem de colisão contínua para o jogador
   * @param {THREE.Vector3} newPos Posição pretendida
   * @param {number} currentCameraY Altura atual dos olhos da câmera
   * @returns {{ collide: boolean, floorHeight: number, obstacle?: Object }}
   */
  checkPlayerCollision(newPos, currentCameraY) {
    return checkPlayerCollisions(newPos, currentCameraY);
  }

  /**
   * Alias de compatibilidade
   */
  checkPlayerCollisions(newPos, currentCameraY) {
    return checkPlayerCollisions(newPos, currentCameraY);
  }

  /**
   * Executa a checagem de colisão simplificada para entidades e inimigos
   * @param {THREE.Vector3} pos Posição pretendida
   * @param {number} radius Raio da entidade
   * @returns {boolean} True se houver colisão
   */
  checkEntityCollision(pos, radius = 0.8) {
    return checkEnemyCollisions(pos, radius);
  }

  /**
   * Alias de compatibilidade
   */
  checkEnemyCollisions(pos, radius = 0.8) {
    return checkEnemyCollisions(pos, radius);
  }

  /**
   * Executa teste de linha de visão desobstruída (Raycast)
   * @param {THREE.Vector3} startPos Ponto de origem
   * @param {THREE.Vector3} targetPos Ponto de destino
   * @returns {boolean} True se houver linha de visão direta
   */
  hasLineOfSight(startPos, targetPos) {
    return hasLineOfSight(startPos, targetPos);
  }

  /**
   * Alias de compatibilidade
   */
  hasLOS(startPos, targetPos) {
    return hasLineOfSight(startPos, targetPos);
  }
}

export const worldService = new WorldService();
