/**
 * Seletor de dificuldade no overlay de início/pausa (Bug 10 / Fase B0).
 * stopPropagation evita que o clique dispare startGame no overlay.
 */
import {
  getDifficulty,
  setDifficulty,
  applyDifficultyToLiving
} from '../config/combatBalance.js?v=20260821';
import { entityRegistry } from '../core/EntityRegistry.js?v=20260830';

export function syncDifficultyButtons() {
  const current = getDifficulty();
  document.querySelectorAll('#difficulty-select [data-diff]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.diff === current);
  });
}

export function initDifficultyUI() {
  const row = document.getElementById('difficulty-select');
  if (!row || row.dataset.bound === '1') return;
  row.dataset.bound = '1';
  row.addEventListener('click', (e) => e.stopPropagation());

  row.querySelectorAll('[data-diff]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.dataset.diff;
      if (!id || getDifficulty() === id) return;
      setDifficulty(id);
      applyDifficultyToLiving(entityRegistry.getAlive());
      syncDifficultyButtons();
    });
  });

  syncDifficultyButtons();
}
