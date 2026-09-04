/**
 * ProjectileManager — Gerenciamento e Varredura Contínua de Projéteis
 * Controla o ciclo de vida dos tiros e executa detecção anti-tunneling contra entidades do EntityRegistry.
 */
import { scene } from '../core/scene.js?v=20260821';
import { entityRegistry } from '../core/EntityRegistry.js?v=20260830';
import { distToSegmentSquared, closestPointOnSegment } from '../utils/math.js?v=20260821';
import { hasLineOfSight } from '../utils/collision.js?v=20260912';
import { damageResolver } from './DamageResolver.js?v=20260821';
import { releaseProjectileMesh } from './ProjectilePool.js?v=20260821';
import { splashVictims } from './splashDamage.js?v=20260824';

const _prevPos = new THREE.Vector3();
const _enemyCenter = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _enemyFwd = new THREE.Vector3();

export class ProjectileManager {
  #projectiles = [];

  /**
   * Spawna um novo projétil em voo
   * @param {Object} config
   * @param {THREE.Mesh} config.mesh Malha 3D já posicionada
   * @param {THREE.Vector3} config.direction Vetor unitário de direção
   * @param {number} config.speed Velocidade em m/s
   * @param {number} config.damage Dano infligido no impacto
   * @param {number} config.maxDistance Alcance máximo em metros
   * @param {number} [config.hitRadius=2.0] Raio de colisão de acerto
   * @param {string} [config.owner='player'] 'player' ou 'enemy'
   */
  spawn({
    mesh,
    direction,
    speed,
    damage,
    maxDistance,
    hitRadius = 2.0,
    splashRadius = 0,
    owner = 'player'
  }) {
    if (!mesh) return null;

    scene.add(mesh);

    const projectileData = {
      mesh,
      dir: direction.clone().normalize(),
      speed,
      damage,
      distanceTraveled: 0,
      maxDistance,
      hitRadius,
      splashRadius,
      owner
    };

    this.#projectiles.push(projectileData);
    return projectileData;
  }

  /**
   * Atualiza a posição de todos os projéteis e resolve colisões contínuas
   * @param {number} delta Tempo transcorrido
   * @param {Object} ctx Contexto do jogo
   */
  update(delta, ctx) {
    if (this.#projectiles.length === 0) return;

    const aliveEntities = entityRegistry.getAlive();

    for (let i = this.#projectiles.length - 1; i >= 0; i--) {
      const p = this.#projectiles[i];
      _prevPos.copy(p.mesh.position);
      const stepDist = p.speed * delta;
      p.mesh.position.addScaledVector(p.dir, stepDist);
      const currPos = p.mesh.position;
      p.distanceTraveled += stepDist;

      let hit = false;

      // Varredura de colisão contínua contra entidades vivas
      if (p.owner === 'player') {
        for (let e = 0; e < aliveEntities.length; e++) {
          const entity = aliveEntities[e];
          if (!entity.isDead && (entity.type === 'spider_bot' || entity.type === 'sentinel' || entity.type === 'enemy')) {
            _enemyCenter.copy(entity.group.position);
            _enemyCenter.y += (entity.hitCenterY !== undefined ? entity.hitCenterY : 1.2);
            const hitThresholdSq = p.hitRadius * p.hitRadius;

            if (distToSegmentSquared(_enemyCenter, _prevPos, currPos) <= hitThresholdSq) {
              // Ponto real de impacto (projeção do centro do inimigo no segmento percorrido)
              closestPointOnSegment(_enemyCenter, _prevPos, currPos, _hitPoint);

              // Facing do inimigo vs. direção oposta ao voo do projétil => golpe pelas costas?
              _enemyFwd.set(0, 0, 1).applyEuler(entity.group.rotation);
              const fromBehind = -p.dir.dot(_enemyFwd) < 0.1;

              const info = typeof entity.getWeakPointInfo === 'function'
                ? entity.getWeakPointInfo(_hitPoint, null, fromBehind)
                : { mult: 1, name: null };

              const finalDamage = Math.max(1, Math.round(p.damage * info.mult));
              const marker = { userData: { weakPoint: info.name, isCrit: info.mult > 1, source: 'player' } };

              damageResolver.resolveProjectile(entity, finalDamage, _hitPoint.clone(), marker, ctx?.gameContext || ctx);
              if (p.splashRadius > 0) {
                const roster = [];
                for (let s = 0; s < aliveEntities.length; s++) {
                  const other = aliveEntities[s];
                  roster.push({
                    id: other,
                    x: other.group.position.x,
                    z: other.group.position.z,
                    isDead: other.isDead
                  });
                }
                const splashHits = splashVictims(entity, _hitPoint.x, _hitPoint.z, roster, p.splashRadius, p.damage);
                for (let s = 0; s < splashHits.length; s++) {
                  damageResolver.resolveProjectile(
                    splashHits[s].id,
                    splashHits[s].damage,
                    _hitPoint.clone(),
                    marker,
                    ctx?.gameContext || ctx
                  );
                }
              }
              hit = true;
              break;
            }
          }
        }
      }

      // Colisão com o mundo (paredes, árvores, carros): nenhum projétil atravessa obstáculos
      if (!hit && !hasLineOfSight(_prevPos, currPos)) {
        releaseProjectileMesh(p.mesh);
        this.#projectiles.splice(i, 1);
        continue;
      }

      if (hit || p.distanceTraveled >= p.maxDistance) {
        releaseProjectileMesh(p.mesh);
        this.#projectiles.splice(i, 1);
      }
    }
  }

  /**
   * Retorna os projéteis ativos
   */
  get activeProjectiles() {
    return this.#projectiles;
  }

  /**
   * Remove todos os projéteis da cena
   */
  clear() {
    for (let i = 0; i < this.#projectiles.length; i++) {
      releaseProjectileMesh(this.#projectiles[i].mesh);
    }
    this.#projectiles = [];
  }
}

export const projectileManager = new ProjectileManager();
