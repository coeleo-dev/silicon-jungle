/**
 * Lista de mundos no overlay de início/pausa (Bug 14 / Fase E).
 * stopPropagation impede que cliques na lista disparem startGame.
 */
import {
  listWorlds,
  getActiveSlotId,
  createWorld,
  renameWorld,
  deleteWorld,
  setActiveWorld,
  requestWorldReload,
  saveGame,
  canCreateWorld
} from '../core/saveSystem.js?v=20260914';
import { getDifficulty } from '../config/combatBalance.js?v=20260821';

const DIFF_LABEL = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

let getSurvivalStats = () => ({ dataEnergy: 100, circuitIntegrity: 100 });

function saveCurrentIfPossible() {
  if (!getActiveSlotId()) return;
  const stats = getSurvivalStats?.();
  if (stats) saveGame(stats);
}

function formatUpdatedAt(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('en-US', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '—';
  }
}

export function renderWorldList() {
  const list = document.getElementById('world-list');
  const btnStart = document.getElementById('btn-start');
  const btnStartText = document.getElementById('btn-start-text');
  const btnNew = document.getElementById('btn-world-new');
  const nameInput = document.getElementById('world-new-name');
  if (!list) return;

  const index = listWorlds();
  const activeId = index.activeId;
  const slots = index.slots || [];

  list.innerHTML = '';
  if (slots.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'world-empty';
    empty.textContent = 'No worlds yet. Create the first one to begin.';
    list.appendChild(empty);
  } else {
    for (const slot of slots) {
      list.appendChild(buildRow(slot, slot.id === activeId));
    }
  }

  if (btnStart) {
    btnStart.style.display = activeId ? '' : 'none';
    if (btnStartText && activeId && btnStartText.textContent === 'START EXPEDITION') {
      btnStartText.textContent = 'CONTINUE EXPEDITION';
    }
  }

  const hint = document.getElementById('overlay-hint');
  if (hint) {
    hint.textContent = activeId
      ? 'Click Continue or press the button'
      : 'Create a world to begin';
  }

  const canCreate = canCreateWorld();
  if (btnNew) btnNew.disabled = !canCreate;
  if (nameInput) {
    nameInput.disabled = !canCreate;
    nameInput.placeholder = canCreate ? `World ${slots.length + 1}` : 'Limit of 8 worlds';
  }
}

function buildRow(slot, isActive) {
  const row = document.createElement('div');
  row.className = 'world-row' + (isActive ? ' is-active' : '');
  row.dataset.id = slot.id;

  const info = document.createElement('div');
  info.className = 'world-row-info';

  const nameEl = document.createElement('div');
  nameEl.className = 'world-row-name';
  nameEl.textContent = slot.name + (isActive ? ' (active)' : '');

  const meta = document.createElement('div');
  meta.className = 'world-row-meta';
  const diff = DIFF_LABEL[slot.difficulty] || slot.difficulty || 'Normal';
  const cores = slot.summary?.cores ?? 0;
  const energy = slot.summary?.dataEnergy ?? 100;
  meta.textContent = `${diff} · ${cores} cells · energy ${Math.round(energy)} · ${formatUpdatedAt(slot.updatedAt)}`;

  info.appendChild(nameEl);
  info.appendChild(meta);

  const actions = document.createElement('div');
  actions.className = 'world-row-actions';

  if (!isActive) {
    const useBtn = document.createElement('button');
    useBtn.type = 'button';
    useBtn.className = 'world-action';
    useBtn.dataset.act = 'use';
    useBtn.textContent = 'Use';
    actions.appendChild(useBtn);
  }

  const renameBtn = document.createElement('button');
  renameBtn.type = 'button';
  renameBtn.className = 'world-action';
  renameBtn.dataset.act = 'rename';
  renameBtn.textContent = 'Rename';
  actions.appendChild(renameBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button';
  delBtn.className = 'world-action world-action-danger';
  delBtn.dataset.act = 'delete';
  delBtn.textContent = 'Delete';
  actions.appendChild(delBtn);

  row.appendChild(info);
  row.appendChild(actions);
  return row;
}

function onListClick(e) {
  e.preventDefault();
  e.stopPropagation();
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const row = btn.closest('.world-row');
  const id = row?.dataset.id;
  if (!id) return;
  const act = btn.dataset.act;
  const slot = (listWorlds().slots || []).find((s) => s.id === id);

  if (act === 'use') {
    if (id === getActiveSlotId()) return;
    saveCurrentIfPossible();
    if (setActiveWorld(id)) requestWorldReload();
    return;
  }

  if (act === 'rename') {
    const next = window.prompt('New world name:', slot?.name || '');
    if (next == null) return;
    if (renameWorld(id, next)) renderWorldList();
    return;
  }

  if (act === 'delete') {
    const ok = window.confirm(`Delete the world "${slot?.name || id}"? This cannot be undone.`);
    if (!ok) return;
    const wasActive = id === getActiveSlotId();
    deleteWorld(id);
    if (wasActive) requestWorldReload();
    else renderWorldList();
  }
}

function onNewSubmit(e) {
  e.preventDefault();
  e.stopPropagation();
  if (!canCreateWorld()) return;
  const input = document.getElementById('world-new-name');
  const name = input ? input.value : '';
  saveCurrentIfPossible();
  const created = createWorld({
    name,
    difficulty: getDifficulty()
  });
  if (created) requestWorldReload();
}

export function initWorldSelectUI(opts = {}) {
  if (typeof opts.getSurvivalStats === 'function') {
    getSurvivalStats = opts.getSurvivalStats;
  }
  const root = document.getElementById('world-select');
  if (!root || root.dataset.bound === '1') return;
  root.dataset.bound = '1';
  root.addEventListener('click', (e) => e.stopPropagation());

  const list = document.getElementById('world-list');
  if (list) list.addEventListener('click', onListClick);

  const form = document.getElementById('world-new-form');
  if (form) form.addEventListener('submit', onNewSubmit);

  renderWorldList();
}
