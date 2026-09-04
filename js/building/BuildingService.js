/**
 * BuildingService — modo build, ghost, place/refund, save, colisão.
 */
import { scene, camera } from '../core/scene.js?v=20260821';
import { worldService } from '../core/WorldService.js?v=20260821';
import { inventory } from '../entities/inventory.js?v=20260912';
import { eventBus } from '../core/EventBus.js?v=20260821';
import { EVENTS } from '../core/events.js?v=20260912';
import { addCollider, removeCollider } from '../utils/collision.js?v=20260912';
import { interactiveRegistry } from '../core/InteractiveRegistry.js?v=20260821';
import { BUILD_RANGE, STOREY_HEIGHT, canonicalWall, createOccupancy, floorY, placeBlockReason, rotateYaw90, snapCell, snapWallEdge, storeyLayerFromAim, yawToDir } from './buildGrid.js?v=20260914';
import { getCatalogEntry, listImplementedTypes } from './buildCatalog.js?v=20260912';
import {
  applyBuildings as applyOps,
  place as placeOps,
  removeAt as removeOps,
  snapshotBuildings as snapOps
} from './buildingOps.js?v=20260914';
import { applyDoorOpen, createGhostMesh, createPieceMesh, positionWallGroup, tintGhost } from './buildMeshes.js?v=20260912';

const _dir = new THREE.Vector3();

const PLACE_FAIL_TEXT = {
  no_stack: 'No pieces. Craft at a workbench.',
  occupied: 'Cell occupied.',
  need_floor: 'Needs a floor on this cell.',
  need_walls: 'Upper storey needs 4 walls.',
  out_of_range: 'Get closer.',
  blocked: 'Cannot place here.'
};

function placeFailBanner(reason) {
  return PLACE_FAIL_TEXT[reason] || PLACE_FAIL_TEXT.blocked;
}

class BuildingService {
  constructor() {
    this.occ = createOccupancy();
    this.records = [];
    this.meshes = new Map();
    this.colliders = new Map();
    this.buildMode = false;
    this.selectedType = 'floor';
    this.yaw = 0;
    this.ghost = null;
    this.ghostOk = true;
    this.ghostFailReason = null;
    this.aim = { ix: 0, iz: 0, layer: 0, edge: 'N' };
    this.gameContext = null;
    this.ui = {};
    this.onPlaced = (rec) => this._spawnWorld(rec);
    this.onRemoved = (rec) => this._despawnWorld(rec);
  }

  bindUi(ui) {
    this.ui = ui || {};
  }

  isBuildMode() {
    return this.buildMode;
  }

  setGameContext(ctx) {
    this.gameContext = ctx;
  }

  setBuildMode(on) {
    this.buildMode = !!on;
    if (!this.buildMode) this._clearGhost();
    else this._ensureGhost();
    this.paintHotbar();
  }

  toggleBuildMode() {
    this.setBuildMode(!this.buildMode);
  }

  cycleType(dir) {
    const types = listImplementedTypes();
    if (!types.length) return this.selectedType;
    const d = dir >= 0 ? 1 : -1;
    let i = types.indexOf(this.selectedType);
    if (i < 0) i = 0;
    this.selectedType = types[(i + d + types.length) % types.length];
    this._rebuildGhost();
    this.paintHotbar();
    return this.selectedType;
  }

  rotateGhost90() {
    this.yaw = rotateYaw90(this.yaw);
  }

  heightFn(x, z) {
    return worldService.getHeight(x, z);
  }

  tickGhost(cam = camera, heightFn) {
    if (!this.buildMode) return;
    const hf = heightFn || ((x, z) => this.heightFn(x, z));
    if (!cam || !cam.getWorldDirection) return;
    cam.getWorldDirection(_dir);
    let t = 6;
    if (_dir.y < -0.08) t = Math.min(BUILD_RANGE, 1.55 / -_dir.y);
    t = Math.min(Math.max(t, 1.2), BUILD_RANGE);
    const x = cam.position.x + _dir.x * t;
    const z = cam.position.z + _dir.z * t;
    const horiz = Math.hypot(_dir.x * t, _dir.z * t);
    let ax = x;
    let az = z;
    if (horiz > BUILD_RANGE) {
      const s = BUILD_RANGE / horiz;
      ax = cam.position.x + _dir.x * t * s;
      az = cam.position.z + _dir.z * t * s;
    }
    const { ix, iz } = snapCell(ax, az);
    const gy = hf(ix, iz);
    const aimY = cam.position.y + _dir.y * t;
    const layer = storeyLayerFromAim(aimY, gy);
    const edge = snapWallEdge(ax, az, ix, iz);
    this.aim = { ix, iz, layer, edge };
    const type = this.selectedType;
    const extra = { edge, rot: this.yaw };
    const entry = getCatalogEntry(type);
    const stack = entry ? inventory.getResource(entry.inventoryKey) : 0;
    const blockReason = placeBlockReason(this.occ, type, ix, iz, layer, extra);
    const inRange = Math.hypot(cam.position.x - ix, cam.position.z - iz) <= BUILD_RANGE + 0.51;
    let fail = null;
    if (!inRange) fail = 'out_of_range';
    else if (stack < 1) fail = 'no_stack';
    else if (blockReason) fail = blockReason;
    this.ghostFailReason = fail;
    const ok = fail == null;
    this.ghostOk = ok;
    this._ensureGhost();
    const y = floorY(ix, iz, layer, hf);
    if (type === 'wall' || type === 'door') {
      const canon = canonicalWall(ix, iz, layer, edge);
      positionWallGroup(this.ghost, { ix: canon.ix, iz: canon.iz, y, edge: canon.edge, layer: canon.layer });
    } else {
      this.ghost.position.set(ix, y, iz);
      this.ghost.rotation.y = type === 'floor' ? 0 : this.yaw;
    }
    this.ghost.visible = inRange;
    tintGhost(this.ghost, ok);
    this.paintHotbar();
  }

  tryPlace() {
    const { ix, iz, layer, edge } = this.aim;
    if (!this.buildMode) return false;
    if (!this.ghostOk) {
      eventBus.emit(EVENTS.UI_BANNER, { text: placeFailBanner(this.ghostFailReason), icon: '⚠️' });
      return false;
    }
    const res = placeOps(this, {
      type: this.selectedType,
      ix,
      iz,
      layer,
      rot: this.yaw,
      edge,
      inventory,
      heightFn: (x, z) => this.heightFn(x, z),
      consume: true
    });
    if (!res.ok) {
      eventBus.emit(EVENTS.UI_BANNER, { text: placeFailBanner(res.reason), icon: '⚠️' });
      return false;
    }
    eventBus.emit(EVENTS.BUILD_PLACED, { record: res.record });
    this.paintHotbar();
    return true;
  }

  tryRemove() {
    if (!this.buildMode) return false;
    const { ix, iz, layer, edge } = this.aim;
    const res = removeOps(this, {
      ix,
      iz,
      layer,
      typeHint: this.selectedType,
      edge,
      inventory,
      refund: true
    });
    if (!res.ok) {
      if (res.reason === 'crate_not_empty') {
        eventBus.emit(EVENTS.UI_BANNER, { text: 'Empty the crate before demolishing.', icon: '📦' });
      }
      return false;
    }
    eventBus.emit(EVENTS.BUILD_REMOVED, { record: res.record });
    this.paintHotbar();
    return true;
  }

  snapshotBuildings() {
    return snapOps(this);
  }

  applyBuildings(records, heightFn) {
    const hf = heightFn || ((x, z) => this.heightFn(x, z));
    applyOps(this, records, hf);
    this.paintHotbar();
  }

  interactRecord(rec) {
    if (!rec) return;
    if (rec.type === 'door') {
      rec.open = !rec.open;
      const mesh = this.meshes.get(rec.id);
      applyDoorOpen(mesh, rec.open);
      this._syncDoorCollider(rec);
      return;
    }
    if (rec.type === 'crate') {
      if (this.ui.openCrateMenu) this.ui.openCrateMenu(rec);
      return;
    }
    if (rec.type === 'bench') {
      if (this.ui.openCraftingMenu) this.ui.openCraftingMenu(this.gameContext);
    }
  }

  paintHotbar() {
    if (typeof document === 'undefined') return;
    const bar = document.getElementById('build-hotbar');
    if (!bar) return;
    bar.style.display = this.buildMode ? 'flex' : 'none';
    const entry = getCatalogEntry(this.selectedType);
    const nameEl = document.getElementById('build-hotbar-name');
    const stackEl = document.getElementById('build-hotbar-stack');
    const hintEl = document.getElementById('build-hotbar-hint');
    if (nameEl) nameEl.textContent = entry ? entry.label : '—';
    if (stackEl) stackEl.textContent = entry ? String(inventory.getResource(entry.inventoryKey)) : '0';
    if (hintEl) {
      const failHint = this.buildMode && this.ghostFailReason ? `  |  ${placeFailBanner(this.ghostFailReason)}` : '';
      hintEl.textContent = entry ? `[ ]  SCROLL  |  ${entry.costHint}${failHint}` : '';
    }
  }

  _ensureGhost() {
    if (this.ghost) return;
    this._rebuildGhost();
  }

  _rebuildGhost() {
    this._clearGhost();
    if (!this.buildMode || typeof THREE === 'undefined') return;
    this.ghost = createGhostMesh(this.selectedType, this.ghostOk);
    scene.add(this.ghost);
  }

  _clearGhost() {
    if (!this.ghost) return;
    scene.remove(this.ghost);
    this.ghost = null;
  }

  _spawnWorld(rec) {
    if (typeof THREE === 'undefined') return;
    const mesh = createPieceMesh(rec.type, { open: rec.open });
    if (rec.type === 'wall' || rec.type === 'door') {
      positionWallGroup(mesh, rec);
      if (rec.type === 'door') applyDoorOpen(mesh, rec.open);
    } else {
      mesh.position.set(rec.x, rec.y, rec.z);
      mesh.rotation.y = rec.type === 'floor' ? 0 : rec.rot;
    }
    scene.add(mesh);
    this.meshes.set(rec.id, mesh);
    this._bindInteract(rec, mesh);
    this._addColliders(rec);
  }

  _despawnWorld(rec) {
    const mesh = this.meshes.get(rec.id);
    if (mesh) {
      this._unbindInteract(mesh);
      scene.remove(mesh);
      this.meshes.delete(rec.id);
    }
    const cols = this.colliders.get(rec.id) || [];
    for (let i = 0; i < cols.length; i++) removeCollider(cols[i]);
    this.colliders.delete(rec.id);
  }

  _bindInteract(rec, mesh) {
    if (rec.type !== 'door' && rec.type !== 'crate' && rec.type !== 'bench') return;
    const ud = {
      type: rec.type,
      prompt: rec.type === 'door' ? '[E] OPEN / CLOSE DOOR' : rec.type === 'crate' ? '[E] OPEN CRATE' : '[E] CRAFTING BENCH',
      action: () => this.interactRecord(rec)
    };
    mesh.traverse((ch) => {
      if (ch.isMesh) {
        ch.userData = ud;
        interactiveRegistry.register(ch);
      }
    });
  }

  _unbindInteract(mesh) {
    mesh.traverse((ch) => {
      if (ch.isMesh) interactiveRegistry.unregister(ch);
    });
  }

  _addColliders(rec) {
    const cols = [];
    if (rec.type === 'floor') {
      cols.push({
        type: 'floor',
        minX: rec.ix - 0.5,
        maxX: rec.ix + 0.5,
        minZ: rec.iz - 0.5,
        maxZ: rec.iz + 0.5,
        y: rec.y + 0.05,
        _buildId: rec.id
      });
    } else if (rec.type === 'wall' || (rec.type === 'door' && !rec.open)) {
      cols.push(this._wallCollider(rec));
    } else if (rec.type === 'stair') {
      const dir = yawToDir(rec.rot);
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) / steps;
        const y = rec.y + (i + 1) * (STOREY_HEIGHT / steps);
        const cx = rec.ix + dir.dx * t;
        const cz = rec.iz + dir.dz * t;
        cols.push({
          type: 'floor',
          minX: cx - 0.45,
          maxX: cx + 0.45,
          minZ: cz - 0.45,
          maxZ: cz + 0.45,
          y,
          _buildId: rec.id
        });
      }
    } else if (rec.type === 'crate' || rec.type === 'bench') {
      if (typeof THREE !== 'undefined') {
        cols.push({
          type: 'box',
          box: new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(rec.ix, rec.y + 0.45, rec.iz),
            new THREE.Vector3(0.8, 0.9, 0.8)
          ),
          _buildId: rec.id
        });
      }
    }
    for (let i = 0; i < cols.length; i++) addCollider(cols[i]);
    this.colliders.set(rec.id, cols);
  }

  _wallCollider(rec) {
    const y0 = rec.y;
    const y1 = rec.y + STOREY_HEIGHT;
    if (typeof THREE === 'undefined') {
      return { type: 'box', minX: 0, maxX: 0, minY: y0, maxY: y1, minZ: 0, maxZ: 0, _buildId: rec.id };
    }
    if (rec.edge === 'E') {
      return {
        type: 'box',
        box: new THREE.Box3(
          new THREE.Vector3(rec.ix + 0.42, y0, rec.iz - 0.5),
          new THREE.Vector3(rec.ix + 0.58, y1, rec.iz + 0.5)
        ),
        _buildId: rec.id
      };
    }
    return {
      type: 'box',
      box: new THREE.Box3(
        new THREE.Vector3(rec.ix - 0.5, y0, rec.iz + 0.42),
        new THREE.Vector3(rec.ix + 0.5, y1, rec.iz + 0.58)
      ),
      _buildId: rec.id
    };
  }

  _syncDoorCollider(rec) {
    const cols = this.colliders.get(rec.id) || [];
    for (let i = 0; i < cols.length; i++) removeCollider(cols[i]);
    this.colliders.set(rec.id, []);
    if (!rec.open) this._addColliders(rec);
  }
}

export const buildingService = new BuildingService();

export function snapshotBuildings() {
  return buildingService.snapshotBuildings();
}

export function applyBuildings(records, heightFn) {
  buildingService.applyBuildings(records, heightFn);
}

export { listImplementedTypes };
