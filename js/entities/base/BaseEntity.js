/**
 * BaseEntity — Classe Abstrata Base para Todas as Entidades do Jogo
 * Unifica o ciclo de vida, gerenciamento no Scene/Registry, alinhamento ao relevo e dano.
 */
import { scene } from '../../core/scene.js?v=20260821';
import { entityRegistry } from '../../core/EntityRegistry.js?v=20260830';
import { eventBus } from '../../core/EventBus.js?v=20260821';

export class BaseEntity {
  /**
   * @param {Object} config
   * @param {string} config.type Tipo da entidade (ex: 'spider_bot', 'sentinel')
   * @param {THREE.Vector3|Object} config.position Posição 3D inicial
   * @param {number} [config.hp=100] Pontos de vida atuais
   * @param {number} [config.maxHp=100] Pontos de vida máximos
   * @param {number} [config.speed=5.0] Velocidade de locomoção
   * @param {boolean} [config.autoRegister=true] Se deve registrar automaticamente no EntityRegistry e Scene
   */
  constructor({
    type = 'base_entity',
    position = { x: 0, y: 0, z: 0 },
    hp = 100,
    maxHp = 100,
    speed = 5.0,
    autoRegister = true
  } = {}) {
    this.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `entity_${Date.now()}_${Math.random()}`;
    this.type = type;
    this.hp = hp;
    this.maxHp = maxHp;
    this.speed = speed;
    this.isDead = false;
    this.hitCenterY = 1.2;

    this.group = new THREE.Group();
    this.group.position.set(position.x || 0, position.y || 0, position.z || 0);

    // Permitir referência reversa via userData da raiz
    this.group.userData = { entityRef: this, entityId: this.id, type: this.type };

    if (autoRegister) {
      this.register();
    }
  }

  /**
   * Registra a entidade no Registry e adiciona o Group na Scene
   */
  register() {
    scene.add(this.group);
    entityRegistry.register(this);
  }

  /**
   * Constrói os componentes 3D e adiciona no this.group
   * Método abstrato a ser implementado pelas subclasses.
   */
  buildModel() {
    // Override nas subclasses
  }

  /**
   * Atualização de estado e física executada a cada frame
   * @param {number} delta Tempo transcorrido no frame
   * @param {number} time Tempo total da simulação
   * @param {Object} ctx Contexto do jogo
   */
  update(delta, time, ctx) {
    // Override nas subclasses
  }

  /**
   * Alinha a coordenada Y da entidade à superfície do terreno
   * @param {Object|Function} worldServiceOrGetHeight Fachada WorldService ou função getHeight
   * @param {number} [yOffset=0] Elevação adicional sobre o solo
   */
  alignToTerrain(worldServiceOrGetHeight, yOffset = 0) {
    if (worldServiceOrGetHeight && typeof worldServiceOrGetHeight.checkPlayerCollision === 'function') {
      const col = worldServiceOrGetHeight.checkPlayerCollision(this.group.position, this.group.position.y);
      const floorH = col && col.floorHeight !== undefined ? (col.floorHeight - 1.8) : worldServiceOrGetHeight.getHeight(this.group.position.x, this.group.position.z);
      this.group.position.y = floorH + yOffset;
    } else {
      const getHeight = typeof worldServiceOrGetHeight === 'function'
        ? worldServiceOrGetHeight
        : (worldServiceOrGetHeight?.getHeight ? worldServiceOrGetHeight.getHeight.bind(worldServiceOrGetHeight) : null);

      if (getHeight) {
        const terrainY = getHeight(this.group.position.x, this.group.position.z);
        this.group.position.y = terrainY + yOffset;
      }
    }
  }

  /**
   * Aplica dano à entidade
   * @param {number} amount Quantidade de dano
   * @param {THREE.Vector3} [hitPoint] Ponto exato de impacto
   * @param {THREE.Object3D} [hitObject] Malha específica atingida
   * @param {Object} [gameContext] Contexto do jogo
   */
  takeDamage(amount, hitPoint = null, hitObject = null, gameContext = null) {
    if (this.isDead) return;

    this.hp -= amount;
    eventBus.emit('entity:damaged', {
      entity: this,
      damage: amount,
      hitPoint: hitPoint || this.position,
      hitObject: hitObject,
      gameContext: gameContext,
      isCrit: !!(hitObject && hitObject.userData && hitObject.userData.isCrit),
      weakPoint: (hitObject && hitObject.userData && hitObject.userData.weakPoint) || null,
      source: (hitObject && hitObject.userData && hitObject.userData.source) || null
    });

    if (this.hp <= 0) {
      this.die(gameContext);
    }
  }

  /**
   * Destrói a entidade e notifica ouvintes
   * @param {Object} [gameContext]
   */
  die(gameContext = null) {
    if (this.isDead) return;
    this.isDead = true;

    eventBus.emit('entity:killed', {
      entity: this,
      type: this.type,
      position: this.group.position.clone(),
      gameContext: gameContext
    });

    scene.remove(this.group);
    entityRegistry.unregister(this);
  }

  despawnSilent() {
    if (this.isDead) return;
    this.isDead = true;
    scene.remove(this.group);
    entityRegistry.unregister(this);
  }

  /**
   * Retorna a distância euclidiana até uma posição 3D
   * @param {THREE.Vector3|Object} targetPos
   * @returns {number}
   */
  distanceTo(targetPos) {
    return this.group.position.distanceTo(targetPos);
  }

  /**
   * Retorna a posição central da entidade
   * @returns {THREE.Vector3}
   */
  get position() {
    return this.group.position;
  }
}
