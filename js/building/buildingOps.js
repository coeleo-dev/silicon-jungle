/**
 * Place/remove/serialize de peças. Sem Three — inject inventory + occupancy.
 */
import {
  canonicalWall,
  doorKey,
  floorKey,
  floorY,
  furnKey,
  occupancyKeyFor,
  placeBlockReason,
  stairKey,
  wallKey
} from './buildGrid.js';
import { getCatalogEntry } from './buildCatalog.js';

let _seq = 1;

export function nextBuildId() {
  _seq += 1;
  return `b_${_seq}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function resetBuildIdSeq(n = 1) {
  _seq = n;
}

export function emptyPieceInventory(base = {}) {
  return {
    energyCells: 0,
    copperWires: 0,
    thermalPastes: 0,
    clockCrystals: 0,
    pureSilicon: 0,
    silverCompound: 0,
    lithiumCells: 0,
    electrolyte: 0,
    tiCuAlloy: 0,
    pcbFloor: 0,
    pcbWall: 0,
    pcbDoor: 0,
    pcbStair: 0,
    pcbCrate: 0,
    pcbBench: 0,
    ...base
  };
}

export function crateIsEmpty(inv) {
  if (!inv || typeof inv !== 'object') return true;
  const keys = Object.keys(inv);
  for (let i = 0; i < keys.length; i++) {
    if ((inv[keys[i]] || 0) > 0) return false;
  }
  return true;
}

export function makeRecord({ type, ix, iz, layer, rot, edge, heightFn, id }) {
  const L = Number(layer) || 0;
  const y = floorY(ix, iz, L, heightFn);
  const rec = {
    id: id || nextBuildId(),
    type,
    x: ix,
    y,
    z: iz,
    rot: Number(rot) || 0,
    layer: L
  };
  if (type === 'wall' || type === 'door') {
    const canon = canonicalWall(ix, iz, L, edge);
    rec.ix = canon.ix;
    rec.iz = canon.iz;
    rec.x = canon.ix;
    rec.z = canon.iz;
    rec.edge = canon.edge;
    rec.layer = canon.layer;
  } else {
    rec.ix = ix;
    rec.iz = iz;
  }
  if (type === 'door') rec.open = false;
  if (type === 'crate') rec.inventory = emptyPieceInventory();
  return rec;
}

export function recordOccupancyKey(rec) {
  if (rec.type === 'wall') return wallKey(rec.ix, rec.iz, rec.layer, rec.edge);
  if (rec.type === 'door') return doorKey(rec.ix, rec.iz, rec.layer, rec.edge);
  return occupancyKeyFor(rec.type, rec.ix, rec.iz, rec.layer, rec);
}

export function canPlaceType(occ, type, ix, iz, layer, extra = {}) {
  return placeBlockReason(occ, type, ix, iz, layer, extra) == null;
}

function consumeOne(inventory, key) {
  if (!inventory) return true;
  if (typeof inventory.consumeResource === 'function') {
    return inventory.consumeResource(key, 1);
  }
  if (inventory.resources && inventory.resources[key] >= 1) {
    inventory.resources[key] -= 1;
    return true;
  }
  return false;
}

function refundOne(inventory, key) {
  if (!inventory) return;
  if (typeof inventory.addResource === 'function') {
    inventory.addResource(key, 1);
    return;
  }
  if (inventory.resources) {
    inventory.resources[key] = (inventory.resources[key] || 0) + 1;
  }
}

export function place(state, opts) {
  const {
    type, ix, iz, layer = 0, rot = 0, edge = 'N',
    inventory = null, heightFn = () => 0, consume = true
  } = opts;
  const entry = getCatalogEntry(type);
  if (!entry) return { ok: false, reason: 'unknown' };
  const blockReason = placeBlockReason(state.occ, type, ix, iz, layer, { edge, rot });
  if (blockReason) {
    return { ok: false, reason: blockReason };
  }
  if (consume) {
    const have = inventory && typeof inventory.getResource === 'function'
      ? inventory.getResource(entry.inventoryKey)
      : (inventory?.resources?.[entry.inventoryKey] || 0);
    if (have < 1) return { ok: false, reason: 'no_stack' };
    if (!consumeOne(inventory, entry.inventoryKey)) return { ok: false, reason: 'no_stack' };
  }
  const rec = makeRecord({ type, ix, iz, layer, rot, edge, heightFn });
  if (type === 'door' && opts.open != null) rec.open = !!opts.open;
  if (type === 'crate' && opts.pieceInventory) rec.inventory = emptyPieceInventory(opts.pieceInventory);
  if (type === 'door') {
    const wk = wallKey(rec.ix, rec.iz, rec.layer, rec.edge);
    if (state.occ.has(wk)) {
      state.occ.remove(wk);
      const wallRec = state.records.find((r) => r.type === 'wall' && recordOccupancyKey(r) === wk);
      if (wallRec) {
        const idx = state.records.indexOf(wallRec);
        if (idx >= 0) state.records.splice(idx, 1);
        if (consume) refundOne(inventory, getCatalogEntry('wall').inventoryKey);
        if (state.onRemoved) state.onRemoved(wallRec);
      }
    }
  }
  if (!state.occ.add(recordOccupancyKey(rec))) {
    if (consume) refundOne(inventory, entry.inventoryKey);
    return { ok: false, reason: 'blocked' };
  }
  state.records.push(rec);
  if (state.onPlaced) state.onPlaced(rec);
  return { ok: true, record: rec };
}

export function removeAt(state, opts) {
  const { ix, iz, layer = 0, typeHint = null, inventory = null, refund = true } = opts;
  const L = Number(layer) || 0;
  let rec = null;
  const order = typeHint
    ? [typeHint]
    : ['crate', 'bench', 'stair', 'door', 'wall', 'floor'];
  for (let t = 0; t < order.length; t++) {
    const type = order[t];
    rec = findRecord(state, type, ix, iz, L, opts.edge);
    if (rec) break;
  }
  if (!rec && opts.edge) {
    rec = findRecord(state, 'wall', ix, iz, L, opts.edge) || findRecord(state, 'door', ix, iz, L, opts.edge);
  }
  if (!rec) {
    const edges = ['N', 'E', 'S', 'W'];
    for (let e = 0; e < edges.length; e++) {
      rec = findRecord(state, 'door', ix, iz, L, edges[e]) || findRecord(state, 'wall', ix, iz, L, edges[e]);
      if (rec) break;
    }
  }
  if (!rec) return { ok: false, reason: 'missing' };
  if (rec.type === 'crate' && !crateIsEmpty(rec.inventory)) {
    return { ok: false, reason: 'crate_not_empty' };
  }
  state.occ.remove(recordOccupancyKey(rec));
  const idx = state.records.indexOf(rec);
  if (idx >= 0) state.records.splice(idx, 1);
  if (refund) {
    const entry = getCatalogEntry(rec.type);
    if (entry) refundOne(inventory, entry.inventoryKey);
  }
  if (state.onRemoved) state.onRemoved(rec);
  return { ok: true, record: rec };
}

function findRecord(state, type, ix, iz, layer, edge) {
  const L = Number(layer) || 0;
  if (type === 'wall' || type === 'door') {
    const key = type === 'wall' ? wallKey(ix, iz, L, edge || 'N') : doorKey(ix, iz, L, edge || 'N');
    return state.records.find((r) => r.type === type && recordOccupancyKey(r) === key) || null;
  }
  const key = occupancyKeyFor(type, ix, iz, L);
  return state.records.find((r) => r.type === type && recordOccupancyKey(r) === key) || null;
}

export function snapshotBuildings(state) {
  return state.records.map((r) => {
    const copy = {
      id: r.id,
      type: r.type,
      x: r.x,
      y: r.y,
      z: r.z,
      rot: r.rot,
      layer: r.layer
    };
    if (r.edge) copy.edge = r.edge;
    if (r.type === 'door') copy.open = !!r.open;
    if (r.type === 'crate') copy.inventory = emptyPieceInventory(r.inventory || {});
    return copy;
  });
}

export function applyBuildings(state, records, heightFn) {
  const list = Array.isArray(records) ? records : [];
  const existing = state.records.slice();
  for (let i = 0; i < existing.length; i++) {
    removeAt(state, {
      ix: existing[i].ix,
      iz: existing[i].iz,
      layer: existing[i].layer,
      typeHint: existing[i].type,
      edge: existing[i].edge,
      refund: false
    });
  }
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    const placed = place(state, {
      type: r.type,
      ix: r.ix != null ? r.ix : Math.round(r.x),
      iz: r.iz != null ? r.iz : Math.round(r.z),
      layer: r.layer || 0,
      rot: r.rot || 0,
      edge: r.edge || 'N',
      heightFn,
      consume: false,
      open: r.open,
      pieceInventory: r.inventory
    });
    if (placed.ok && r.id) placed.record.id = r.id;
  }
}

export { floorKey, wallKey, stairKey, furnKey, doorKey };
