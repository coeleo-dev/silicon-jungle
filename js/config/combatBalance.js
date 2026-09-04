/**
 * Fonte única de HP/dano inimigo e dificuldade (Bug 10 / Fase B0).
 * Pistola base: CONFIG.WEAPONS.PLASMA_PISTOL.DAMAGE (25).
 */
import { CONFIG } from './constants.js';

export const DIFFICULTY_LEVELS = {
  easy: { id: 'easy', label: 'Easy', enemyDamageMult: 0.75 },
  normal: { id: 'normal', label: 'Normal', enemyDamageMult: 1.0 },
  hard: { id: 'hard', label: 'Hard', enemyDamageMult: 1.25 }
};

export const ENEMY_STATS = {
  spider_bot: {
    hp: { easy: 100, normal: 150, hard: 200 },
    bite: 20,
    web: 22
  },
  sentinel: {
    hp: { easy: 150, normal: 225, hard: 300 },
    laser: 28
  }
};

let currentDifficulty = CONFIG.DIFFICULTY?.DEFAULT || 'normal';

export function getDifficulty() {
  return currentDifficulty;
}

export function setDifficulty(id) {
  if (!DIFFICULTY_LEVELS[id]) return currentDifficulty;
  currentDifficulty = id;
  return currentDifficulty;
}

export function enemyHp(type) {
  const stats = ENEMY_STATS[type];
  if (!stats) return 50;
  return stats.hp[currentDifficulty];
}

export function enemyDamage(type, attack) {
  const stats = ENEMY_STATS[type];
  if (!stats || stats[attack] == null) return 0;
  const mult = DIFFICULTY_LEVELS[currentDifficulty].enemyDamageMult;
  return Math.max(1, Math.round(stats[attack] * mult));
}

export function pistolShotsToKill(type) {
  const dmg = CONFIG.WEAPONS.PLASMA_PISTOL.DAMAGE;
  return Math.ceil(enemyHp(type) / dmg);
}

export function rescaleEntityHp(entity, type) {
  if (!entity) return;
  const newMax = enemyHp(type);
  const ratio = entity.maxHp > 0 ? entity.hp / entity.maxHp : 1;
  entity.maxHp = newMax;
  entity.hp = Math.max(1, Math.round(newMax * ratio));
}

export function applyDifficultyToLiving(entities) {
  if (!entities) return;
  for (const entity of entities) {
    if (!entity || entity.isDead) continue;
    if (entity.type === 'spider_bot' || entity.type === 'sentinel') {
      rescaleEntityHp(entity, entity.type);
    }
  }
}
