/**
 * combatFeedback.js — Feedback Visual de Combate (Fase 3)
 * Orquestra três sistemas de UI diegética sobre o mundo 3D:
 *   1. Health bars flutuantes sobre inimigos (projeção mundo→tela)
 *   2. Números de dano flutuantes (pool reutilizável)
 *   3. Indicador direcional de dano recebido (chevron na borda da tela)
 *
 * Auto-inscreve-se no EventBus; o main.js apenas importa e chama update(delta).
 */
import { eventBus } from '../core/EventBus.js?v=20260821';
import { entityRegistry } from '../core/EntityRegistry.js?v=20260830';
import { camera } from '../core/scene.js?v=20260821';

const ENEMY_TYPES = new Set(['spider_bot', 'sentinel', 'enemy']);

// Altura (em unidades de mundo) do ponto acima da cabeça para ancorar a barra
const BAR_ANCHOR_HEIGHT = { spider_bot: 1.3, sentinel: 3.0, enemy: 1.5 };
const FALLBACK_BAR_HEIGHT = 1.5;

const DAMAGE_POOL_SIZE = 32;      // pool de divs de dano reutilizáveis
const DAMAGE_LIFETIME = 900;      // ms de vida do número de dano
const INDICATOR_DURATION = 1500;  // ms de exibição do chevron direcional
const BAR_MAX_DISTANCE = 60;      // metros; além disso, esconder a barra

// Cores de HP por faixa de preenchimento
function hpColor(ratio) {
  if (ratio > 0.5) return '#00ffaa'; // --pcb-green
  if (ratio > 0.25) return '#ffd24d'; // --pcb-gold (âmbar)
  return '#ef4444'; // vermelho crítico
}

function clamp(v, min, max) {
  return v < min ? min : (v > max ? max : v);
}

// Vetores scratch reutilizados (evita alocações por frame)
const _proj = new THREE.Vector3();
const _anchor = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _toSrc = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

class CombatFeedback {
  constructor() {
    this.ready = false;

    // Sistema 1: health bars
    this.healthbarsEl = null;
    this.healthbars = new Map(); // id -> { el, fill }

    // Sistema 2: números de dano
    this.damageNumbersEl = null;
    this.damagePool = []; // { root, value, active, timer }
    this.damageIndex = 0;

    // Sistema 3: indicador direcional
    this.damageIndicatorEl = null;
    this.damageChevron = null;
    this.indicatorTimer = 0;

    // Auto-inscrição no EventBus (eventos garantidos por outras lanes)
    eventBus.on('entity:damaged', (payload) => this._onEntityDamaged(payload));
    eventBus.on('combat:attacked', (payload) => this._onPlayerAttacked(payload));
  }

  /**
   * Constrói os elementos DOM sob demanda (pool + chevron).
   * Chamado de forma preguiçosa para tolerar ordem de carregamento.
   */
  _ensureDom() {
    if (this.ready) return;

    this.healthbarsEl = document.getElementById('enemy-healthbars');
    this.damageNumbersEl = document.getElementById('damage-numbers');
    this.damageIndicatorEl = document.getElementById('damage-indicator');

    if (!this.healthbarsEl || !this.damageNumbersEl || !this.damageIndicatorEl) {
      return;
    }

    // Pool de números de dano
    for (let i = 0; i < DAMAGE_POOL_SIZE; i++) {
      const root = document.createElement('div');
      root.className = 'damage-number';
      root.style.display = 'none';

      const value = document.createElement('span');
      value.className = 'dn-value';
      root.appendChild(value);

      this.damageNumbersEl.appendChild(root);
      this.damagePool.push({ root, value, active: false, timer: 0 });
    }

    // Chevron direcional único (posicionado dinamicamente na borda)
    this.damageChevron = document.createElement('div');
    this.damageChevron.className = 'damage-chevron';
    this.damageIndicatorEl.appendChild(this.damageChevron);

    this.ready = true;
  }

  /**
   * Loop principal — chamado a cada frame pelo main.js.
   * @param {number} delta Tempo transcorrido no frame (segundos)
   */
  update(delta) {
    this._ensureDom();
    if (!this.ready) return;
    this._updateHealthBars();
  }

  /* ============================== 1. HEALTH BARS ============================== */

  _updateHealthBars() {
    const alive = entityRegistry.getAlive();
    const seen = new Set();

    for (let i = 0; i < alive.length; i++) {
      const e = alive[i];
      if (!ENEMY_TYPES.has(e.type) || e.isDead) continue;
      seen.add(e.id);

      let bar = this.healthbars.get(e.id);
      if (!bar) {
        bar = this._createHealthBar();
        this.healthbars.set(e.id, bar);
      }
      this._positionHealthBar(bar, e);
    }

    // Remove barras órfãs (entidade morta/removida do registry)
    for (const [id, bar] of this.healthbars) {
      if (!seen.has(id)) {
        bar.el.remove();
        this.healthbars.delete(id);
      }
    }
  }

  _createHealthBar() {
    const el = document.createElement('div');
    el.className = 'enemy-healthbar';

    const fill = document.createElement('div');
    fill.className = 'ehb-fill';
    el.appendChild(fill);

    this.healthbarsEl.appendChild(el);
    return { el, fill };
  }

  _positionHealthBar(bar, e) {
    // Esconder quando cheio (sem necessidade de barra)
    if (e.hp >= e.maxHp) {
      bar.el.classList.add('hidden');
      return;
    }

    const dist = camera.position.distanceTo(e.group.position);
    // Cull de distância: além de BAR_MAX_DISTANCE a barra vira ruído visual
    if (dist > BAR_MAX_DISTANCE) {
      bar.el.classList.add('hidden');
      return;
    }

    // Âncora acima da cabeça, conforme o tipo
    _anchor.copy(e.group.position);
    _anchor.y += BAR_ANCHOR_HEIGHT[e.type] || FALLBACK_BAR_HEIGHT;

    const p = this._project(_anchor);
    if (!p) {
      bar.el.classList.add('hidden');
      return;
    }

    bar.el.classList.remove('hidden');

    // Largura encolhe com a distância, mantendo legibilidade
    const width = clamp(60 - dist * 0.6, 30, 60);
    bar.el.style.left = p.x + 'px';
    bar.el.style.top = p.y + 'px';
    bar.el.style.width = width + 'px';

    const ratio = clamp(e.hp / e.maxHp, 0, 1);
    const color = hpColor(ratio);
    bar.fill.style.width = (ratio * 100) + '%';
    bar.fill.style.background = color;
    bar.fill.style.boxShadow = '0 0 6px ' + color;
  }

  /* ============================ 2. DAMAGE NUMBERS ============================ */

  _onEntityDamaged({ entity, damage, hitPoint, isCrit, weakPoint }) {
    this._ensureDom();
    if (!this.ready) return;
    if (!entity || !damage) return;

    const item = this._acquireDamageNumber();
    if (!item) return;

    // Ponto de projeção: hitPoint (impacto) com fallback para acima da cabeça
    let worldPos = hitPoint;
    if (!worldPos || typeof worldPos.x !== 'number') {
      worldPos = _anchor.copy(entity.group.position);
      worldPos.y += BAR_ANCHOR_HEIGHT[entity.type] || FALLBACK_BAR_HEIGHT;
    }

    const p = this._project(worldPos);
    if (!p) {
      this._releaseDamageNumber(item);
      return;
    }

    // Offset aleatório pequeno para evitar sobreposição exata
    item.root.style.left = (p.x + (Math.random() * 20 - 10)) + 'px';
    item.root.style.top = (p.y + (Math.random() * 20 - 10)) + 'px';
    item.value.textContent = String(Math.round(damage));

    // Destaque: crítico (dourado) sobrepõe cor de weakPoint
    item.root.classList.remove('crit', 'core', 'head');
    if (isCrit) {
      item.root.classList.add('crit');
    } else if (weakPoint === 'core') {
      item.root.classList.add('core');
    } else if (weakPoint === 'head') {
      item.root.classList.add('head');
    }

    // Reinicia a animação CSS (float + fade) e agenda devolução ao pool
    item.root.classList.remove('spawn');
    void item.root.offsetWidth; // força reflow para reiniciar keyframes
    item.root.classList.add('spawn');
    item.root.style.display = 'block';

    clearTimeout(item.timer);
    item.timer = setTimeout(() => this._releaseDamageNumber(item), DAMAGE_LIFETIME);
  }

  _acquireDamageNumber() {
    // Prefere um item inativo
    for (let i = 0; i < this.damagePool.length; i++) {
      const item = this.damagePool[i];
      if (!item.active) {
        item.active = true;
        return item;
      }
    }

    // Pool cheio: recicla o mais antigo em rotação circular
    const item = this.damagePool[this.damageIndex];
    this.damageIndex = (this.damageIndex + 1) % this.damagePool.length;
    clearTimeout(item.timer);
    item.active = true;
    return item;
  }

  _releaseDamageNumber(item) {
    item.active = false;
    clearTimeout(item.timer);
    item.root.style.display = 'none';
  }

  /* ======================= 3. DIRECTIONAL DAMAGE INDICATOR ======================= */

  _onPlayerAttacked({ source }) {
    this._ensureDom();
    if (!this.ready) return;
    if (!source) return;

    // Direção do atacante relativa ao jogador, projetada no plano horizontal
    camera.getWorldDirection(_forward);
    _toSrc.copy(source).sub(camera.position);
    _toSrc.y = 0;
    if (_toSrc.lengthSq() < 1e-6) return; // atacante sobre o jogador → sem direção útil
    _toSrc.normalize();

    _fwd.set(_forward.x, 0, _forward.z);
    if (_fwd.lengthSq() < 1e-6) _fwd.set(0, 0, -1);
    _fwd.normalize();

    _right.crossVectors(_fwd, _up);
    const angle = Math.atan2(_toSrc.dot(_right), _toSrc.dot(_fwd));

    this._showIndicator(angle);
  }

  _showIndicator(angle) {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const radius = Math.min(window.innerWidth, window.innerHeight) * 0.42;

    // Mapeia o ângulo (0=frente, ±PI=trás) para uma posição radial na tela
    const x = cx + Math.sin(angle) * radius;
    const y = cy - Math.cos(angle) * radius;
    const deg = angle * (180 / Math.PI);

    this.damageChevron.style.left = x + 'px';
    this.damageChevron.style.top = y + 'px';
    this.damageChevron.style.transform = 'translate(-50%, -50%) rotate(' + deg + 'deg)';

    // Reinicia o fade e agenda desaparecimento
    this.damageChevron.classList.remove('active');
    void this.damageChevron.offsetWidth;
    this.damageChevron.classList.add('active');

    clearTimeout(this.indicatorTimer);
    this.indicatorTimer = setTimeout(() => {
      this.damageChevron.classList.remove('active');
    }, INDICATOR_DURATION);
  }

  /* ================================ HELPERS ================================ */

  /**
   * Projeta um ponto do mundo para coordenadas de tela.
   * @param {THREE.Vector3} worldPos
   * @returns {{x:number, y:number}|null} null quando atrás da câmera (v.z >= 1)
   */
  _project(worldPos) {
    _proj.copy(worldPos).project(camera);
    if (_proj.z >= 1) return null;
    return {
      x: (_proj.x + 1) * 0.5 * window.innerWidth,
      y: (-_proj.y + 1) * 0.5 * window.innerHeight
    };
  }
}

export const combatFeedback = new CombatFeedback();
