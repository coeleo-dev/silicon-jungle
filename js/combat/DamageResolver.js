/**
 * DamageResolver — Processador Central de Dano e Impactos
 * Resolve cálculos de impacto, deflexão por escudo e propaga eventos pelo EventBus.
 */
import { eventBus } from '../core/EventBus.js?v=20260821';
import { camera } from '../core/scene.js?v=20260821';
import { entityRegistry } from '../core/EntityRegistry.js?v=20260830';
import { activeLaserTraps } from '../entities/enemies/SpiderBotEntity.js?v=20260830';
import { interactiveVines, thermalMossClusters } from '../world/vegetation/VegetationManager.js?v=20260912';

// Temp vectors module-level (sem alocação por frame/hit)
const _forward = new THREE.Vector3();
const _toEntity = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _enemyFwd = new THREE.Vector3();

export class DamageResolver {
  /**
   * Resolve impacto de projétil contra uma entidade
   * @param {Object} entity Entidade atingida
   * @param {number} damage Quantidade de dano bruto
   * @param {THREE.Vector3} hitPoint Ponto 3D de colisão
   * @param {THREE.Object3D} [hitObject] Malha atingida
   * @param {Object} [gameContext] Contexto do jogo
   */
  resolveProjectile(entity, damage, hitPoint, hitObject = null, gameContext = null) {
    if (!entity || entity.isDead) return;

    if (typeof entity.takeDamage === 'function') {
      entity.takeDamage(damage, hitPoint, hitObject, gameContext);
    }
  }

  /**
   * Resolve ataque corpo a corpo (Faca de Circuito) em área
   * @param {THREE.Vector3} origin Posição de origem do golpe (câmera do jogador)
   * @param {number} range Alcance efetivo da arma
   * @param {number} damage Dano infligido
   * @param {Object} [gameContext] Contexto do jogo
   * @returns {boolean} True se atingiu algo
   */
  resolveMelee(origin, range, damage, gameContext = null) {
    let hitSomething = false;

    // 1. Dano em Inimigos Registrados (filtro de tipo + cone de direção)
    camera.getWorldDirection(_forward);

    const aliveEntities = entityRegistry.getAlive();
    for (let i = 0; i < aliveEntities.length; i++) {
      const entity = aliveEntities[i];
      if (entity.isDead || typeof entity.takeDamage !== 'function') continue;
      if (entity.type !== 'spider_bot' && entity.type !== 'sentinel' && entity.type !== 'enemy') continue;

      _toEntity.copy(entity.position).sub(origin);
      const dist = _toEntity.length();
      if (dist > range + 0.5) continue;

      // Distância horizontal (antes de normalizar _toEntity)
      const horizDist = Math.hypot(_toEntity.x, _toEntity.z);

      _toEntity.normalize();
      if (_forward.dot(_toEntity) < 0.35) continue; // arco de ~140° à frente

      // Ponto real de impacto no arco do golpe (altura do raio da câmera na distância horizontal do inimigo)
      const hitY = origin.y + _forward.y * horizDist;
      _hitPoint.set(entity.position.x, hitY, entity.position.z);

      // Direção de ataque (forward) vs. facing do inimigo => golpe pelas costas?
      _enemyFwd.set(0, 0, 1).applyEuler(entity.group.rotation);
      const fromBehind = _forward.dot(_enemyFwd) > -0.1;

      const info = typeof entity.getWeakPointInfo === 'function'
        ? entity.getWeakPointInfo(_hitPoint, null, fromBehind)
        : { mult: 1, name: null };

      const finalDamage = Math.max(1, Math.round(damage * info.mult));
      const marker = { userData: { weakPoint: info.name, isCrit: info.mult > 1, source: 'player' } };

      entity.takeDamage(finalDamage, _hitPoint, marker, gameContext);
      hitSomething = true;
    }

    // 2. Destruição de Armadilhas de Teia Laser
    for (let i = 0; i < activeLaserTraps.length; i++) {
      const trap = activeLaserTraps[i];
      const dist = Math.hypot(origin.x - trap.x, origin.z - trap.z);
      if (dist <= range + 2.0 && typeof trap.cut === 'function') {
        trap.cut();
        hitSomething = true;
      }
    }

    // 3. Corte de Cipós Interativos
    for (let i = 0; i < interactiveVines.length; i++) {
      const vine = interactiveVines[i];
      if (!vine.isCut && vine.group) {
        if (origin.distanceTo(vine.group.position) <= range + 2.0) {
          vine.cut();
          hitSomething = true;
        }
      }
    }

    // 4. Colheita de Musgo Térmico
    for (let i = 0; i < thermalMossClusters.length; i++) {
      const moss = thermalMossClusters[i];
      if (!moss.harvested && moss.mesh) {
        if (origin.distanceTo(moss.mesh.position) <= range + 2.0) {
          moss.harvest();
          hitSomething = true;
        }
      }
    }

    eventBus.emit('combat:melee', { origin, range, damage, hitSomething });
    return hitSomething;
  }
}

export const damageResolver = new DamageResolver();
