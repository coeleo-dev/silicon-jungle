/**
 * EnemyEntity — Classe Base para Inimigos e Hostis
 * Implementa máquina de estados genérica (PATROL, CHASE, COMBAT, STUNNED), navegação e loot.
 */
import { BaseEntity } from './BaseEntity.js?v=20260830';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { camera } from '../../core/scene.js?v=20260821';
import { PatrolState } from '../ai/PatrolState.js?v=20260821';
import { ChaseState } from '../ai/ChaseState.js?v=20260821';
import { StunnedState } from '../ai/StunnedState.js?v=20260821';
import { inventory } from '../inventory.js?v=20260912';
import { pickSteerDir } from '../../utils/steer.js?v=20260826';
import { resolveEnemyRenderLod } from '../../utils/enemyRenderLod.js?v=20260828';

const _dir = new THREE.Vector3();
const _nextPos = new THREE.Vector3();
const _bestDir = new THREE.Vector3();
const _testDir = new THREE.Vector3();
const _knockbackNext = new THREE.Vector3();

export class EnemyEntity extends BaseEntity {
  constructor({
    type = 'enemy',
    position = { x: 0, y: 0, z: 0 },
    hp = 50,
    maxHp = 50,
    speed = 5.0,
    patrolRadius = 10,
    aggroRange = 28,
    leashRange = 38,
    lootTable = [],
    autoRegister = true
  } = {}) {
    super({ type, position, hp, maxHp, speed, autoRegister });

    this.tags = new Set(['hostile']);

    this.homeX = position.x || 0;
    this.homeZ = position.z || 0;
    this.patrolRadius = patrolRadius;
    this.patrolAngle = Math.random() * Math.PI * 2;
    this.aggroRange = aggroRange;
    this.leashRange = leashRange;

    this.stunTimer = 0;
    this.walkTime = 0;
    this.lootTable = lootTable;
    this.groundOffset = 0.35;

    // ---------------------------------------------------------------------
    // Zonas de ponto fraco em coordenadas LOCAIS (y do hitPoint - y da entidade).
    // Ordem de prioridade: o primeiro índice com match vence.
    // `behind` opcional: se definido, exige hit pelas costas (fromBehind === behind).
    //
    // CONTRATO para subclasses (SpiderBotEntity / SentinelEntity) configurarem:
    //   this.weakPoints = [
    //     { name: 'head', yMin: 0.75, yMax: Infinity, mult: 2 },
    //     { name: 'core', yMin: 0.3,  yMax: 0.6,      mult: 3, behind: true }
    //   ];
    // ---------------------------------------------------------------------
    this.weakPoints = [];

    // Temporizador de stagger/hitstun (reduz velocidade de movimento enquanto > 0)
    this.staggerTimer = 0;

    // Inicialização da Máquina de Estados (State Pattern)
    this.states = new Map([
      ['PATROL', new PatrolState()],
      ['CHASE', new ChaseState()],
      ['STUNNED', new StunnedState()]
    ]);
    this.currentState = this.states.get('PATROL');
    this.state = 'PATROL';
  }

  /**
   * Altera o estado atual da entidade
   * @param {string} stateName Nome do estado
   */
  setState(stateName) {
    if (this.currentState && this.currentState.name === stateName) return;

    const nextState = this.states.get(stateName);
    if (!nextState) return;

    if (this.currentState && typeof this.currentState.exit === 'function') {
      this.currentState.exit(this);
    }

    this.currentState = nextState;
    this.state = stateName;

    if (typeof this.currentState.enter === 'function') {
      this.currentState.enter(this);
    }
  }

  /**
   * Atualização padrão de inimigo: IA -> Animação -> Alinhamento ao Terreno
   */
  update(delta, time, ctx) {
    if (this.isDead) return;

    if (this.staggerTimer > 0) this.staggerTimer -= delta;

    const playerPos = ctx?.playerPos || ctx?.camera?.position || (typeof camera !== 'undefined' ? camera.position : null);
    this.updateAI(delta, time, playerPos, ctx);

    this.updateAnimation(delta, time);
    this.alignToTerrain(worldService, this.groundOffset);
  }

  /**
   * LOD de render: some no fog (>120 m); entre 50–120 m só o volume do corpo.
   */
  applyRenderLod(distSq) {
    if (!this.group) return;
    const lod = resolveEnemyRenderLod(distSq);
    this.group.visible = lod.groupVisible;
    if (lod.groupVisible) this.setLimbsVisible(lod.limbsVisible);
  }

  setLimbsVisible(_visible) {
    // Override nas subclasses com patas/braços
  }

  /**
   * Executa a atualização do estado de IA ativo
   */
  updateAI(delta, time, playerPos, ctx) {
    if (this.currentState && typeof this.currentState.update === 'function') {
      this.currentState.update(this, delta, time, ctx);
    }
  }

  /**
   * Hook para subclasses adicionarem lógica de combate durante perseguição
   */
  onChaseTick(delta, playerPos, distToPlayer, ctx) {
    // Override nas subclasses
  }

  /**
   * Movimento circular suave de patrulha
   * @param {number} delta
   */
  patrol(delta) {
    this.patrolAngle += delta * 0.4;
    const targetX = this.homeX + Math.cos(this.patrolAngle) * this.patrolRadius;
    const targetZ = this.homeZ + Math.sin(this.patrolAngle) * this.patrolRadius;

    _dir.set(targetX - this.group.position.x, 0, targetZ - this.group.position.z).normalize();
    this.group.rotation.y = Math.atan2(_dir.x, _dir.z);
    this.group.position.addScaledVector(_dir, (this.speed * 0.5) * delta);
    this.walkTime += delta * 5;
  }

  /**
   * Movimento de perseguição em direção ao jogador com desvio de colisão multissensor
   */
  chase(delta, playerPos, distToPlayer, ctx) {
    if (!playerPos) return;

    const look = Math.min(1.8, this.speed * delta * 3.5);
    const steered = pickSteerDir(
      this.group.position.x,
      this.group.position.z,
      playerPos.x,
      playerPos.z,
      (dx, dz) => {
        _testDir.set(dx, 0, dz);
        _nextPos.copy(this.group.position).addScaledVector(_testDir, look);
        return worldService.checkEntityCollision(_nextPos, 0.55);
      }
    );
    _bestDir.set(steered.dx, 0, steered.dz);

    this.group.rotation.y = Math.atan2(_bestDir.x, _bestDir.z);

    if (distToPlayer > 2.5) {
      _nextPos.copy(this.group.position).addScaledVector(_bestDir, this.speed * delta * (this.staggerTimer > 0 ? 0.3 : 1.0));
      if (!worldService.checkEntityCollision(_nextPos, 0.55)) {
        this.group.position.copy(_nextPos);
      }
      this.walkTime += delta * 10;
    }

    this.onChaseTick(delta, playerPos, distToPlayer, ctx);
  }

  /**
   * Animação procedural — a ser implementada pelas subclasses
   */
  updateAnimation(delta, time) {
    // Override nas subclasses
  }

  /**
   * Aplica atordoamento temporário
   */
  applyStun(duration = 1.0) {
    this.stunTimer = duration;
    this.setState('STUNNED');
  }

  /**
   * Resolve o multiplicador de dano do ponto fraco atingido.
   *
   * CONTRATO (consumido por DamageResolver / ProjectileManager):
   * - @param {THREE.Vector3} hitPoint Ponto exato de impacto (coordenadas do MUNDO)
   * - @param {THREE.Object3D} hitObject Malha atingida (opcional)
   * - @param {boolean} fromBehind true se o golpe veio pelas costas do inimigo
   * - @returns {{ mult: number, name: string|null }} Multiplicador e nome da zona
   *
   * Escudo (`hitObject.userData.isShield`) reduz dano a 25%. Demais zonas caem
   * em `this.weakPoints` (coordenadas locais em Y). Fora de zona => mult 1.
   */
  getWeakPointInfo(hitPoint, hitObject, fromBehind) {
    if (hitObject && hitObject.userData && hitObject.userData.isShield) return { mult: 0.25, name: 'shield' };
    if (!hitPoint || this.weakPoints.length === 0) return { mult: 1, name: null };
    const localY = hitPoint.y - this.group.position.y;
    for (const zone of this.weakPoints) {
      if (localY >= zone.yMin && localY <= zone.yMax) {
        if (zone.behind !== undefined && zone.behind !== fromBehind) continue;
        return { mult: zone.mult, name: zone.name };
      }
    }
    return { mult: 1, name: null };
  }

  /**
   * Aplica stagger/hitstun (desaceleração) e knockback opcional ao inimigo.
   * @param {number} [duration=0.2] Duração do stagger em segundos
   * @param {THREE.Vector3} [knockbackDir=null] Direção (não normalizada) do empurrão
   */
  applyStagger(duration = 0.2, knockbackDir = null) {
    this.staggerTimer = Math.max(this.staggerTimer, duration);
    if (knockbackDir) {
      _knockbackNext.copy(this.group.position).addScaledVector(knockbackDir, 0.35);
      if (!worldService.checkEntityCollision(_knockbackNext, 0.55)) this.group.position.copy(_knockbackNext);
    }
  }

  /**
   * Aplica dano com stagger automático.
   * CONTRATO: subclasses (SpiderBot/Sentinel) DEVEM chamar super.takeDamage(...)
   * para herdar o stagger e o evento enriquecido `entity:damaged`.
   */
  takeDamage(amount, hitPoint = null, hitObject = null, gameContext = null) {
    if (this.isDead) return;
    this.applyStagger(0.18);
    super.takeDamage(amount, hitPoint, hitObject, gameContext);
  }

  /**
   * Processa this.lootTable: cada entrada { resource, amount, chance? }.
   * chance opcional (0..1): só dropa se Math.random() < chance.
   */
  dropLoot() {
    if (!Array.isArray(this.lootTable) || this.lootTable.length === 0) return;
    for (const entry of this.lootTable) {
      if (!entry || entry.resource === undefined) continue;
      if (entry.chance !== undefined && Math.random() > entry.chance) continue;
      const amount = entry.amount !== undefined ? entry.amount : 1;
      inventory.addResource(entry.resource, amount);
    }
  }

  die(gameContext = null) {
    if (this.isDead) return;
    this.dropLoot();
    super.die(gameContext);
  }
}
