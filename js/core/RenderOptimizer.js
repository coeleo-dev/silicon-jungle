/**
 * RenderOptimizer.js — visibilidade de interiores, tiles da cidade (frustum + fog) e luz indoor.
 */
import { scene } from './scene.js?v=20260821';
import { quality } from '../config/quality.js?v=20260827';

const TILE_Y_MIN = -20;
const TILE_Y_MAX = 52;
const TILE_PAD = 29;
const INTERIOR_CULL_DIST_SQ = 20 * 20;

export class RenderOptimizer {
  static #buildings = [];
  static #tiles = [];
  static #indoorPointLight = null;
  static #frameCounter = 0;
  static #frustum = null;
  static #projScreen = null;
  static #tmpBox = null;
  static #minV = null;
  static #maxV = null;

  static init() {
    if (!this.#indoorPointLight) {
      this.#indoorPointLight = new THREE.PointLight(0x38bdf8, 1.2, 22);
      this.#indoorPointLight.castShadow = false;
      this.#indoorPointLight.visible = false;
      scene.add(this.#indoorPointLight);
    }
    if (!this.#frustum) {
      this.#frustum = new THREE.Frustum();
      this.#projScreen = new THREE.Matrix4();
      this.#tmpBox = new THREE.Box3();
      this.#minV = new THREE.Vector3();
      this.#maxV = new THREE.Vector3();
    }
  }

  /**
   * Registra um edifício para culling de interiores (grupo de props, não o tile).
   */
  static registerBuilding(x, y, z, group, interiorProps, size = 20) {
    this.init();
    this.#buildings.push({
      x,
      y,
      z,
      group,
      interiorProps,
      size,
      radiusSq: (size * 0.7) * (size * 0.7)
    });
  }

  /**
   * Tile de cidade (~40 m): AABB em userData.tileBox, centro cx/cz.
   */
  static registerTile(group, cx, cz) {
    this.init();
    const b = (group && group.userData && group.userData.tileBox) || {};
    this.#tiles.push({
      group,
      cx,
      cz,
      minX: b.minX != null ? b.minX : cx - 20,
      maxX: b.maxX != null ? b.maxX : cx + 20,
      minZ: b.minZ != null ? b.minZ : cz - 20,
      maxZ: b.maxZ != null ? b.maxZ : cz + 20
    });
  }

  /**
   * Atualiza visibilidade. Interiores <20 m. Tiles: frustum + fog far.
   */
  static update(cameraPos, camera) {
    if (!cameraPos || isNaN(cameraPos.x) || isNaN(cameraPos.z)) return;
    this.init();
    this.#frameCounter++;
    if (this.#frameCounter % 4 !== 0) return;

    let closestDistSq = Infinity;
    let closestBuilding = null;

    for (let i = 0; i < this.#buildings.length; i++) {
      const b = this.#buildings[i];
      const dx = cameraPos.x - b.x;
      const dz = cameraPos.z - b.z;
      const distSq = dx * dx + dz * dz;

      if (b.interiorProps) {
        if (distSq < INTERIOR_CULL_DIST_SQ) {
          if (!b.interiorProps.visible) b.interiorProps.visible = true;
          if (distSq < closestDistSq) {
            closestDistSq = distSq;
            closestBuilding = b;
          }
        } else {
          if (b.interiorProps.visible) b.interiorProps.visible = false;
        }
      }
    }

    if (closestBuilding && closestDistSq < 14 * 14) {
      this.#indoorPointLight.position.set(closestBuilding.x, closestBuilding.y + 3.5, closestBuilding.z);
      this.#indoorPointLight.visible = true;
    } else if (this.#indoorPointLight.visible) {
      this.#indoorPointLight.visible = false;
    }

    this.#updateTiles(cameraPos, camera);
  }

  static #updateTiles(cameraPos, camera) {
    const fogFar = (scene.fog && scene.fog.far) ? scene.fog.far : 165;
    const maxD = fogFar + TILE_PAD;
    const maxDSq = maxD * maxD;

    let frustumReady = false;
    if (camera && camera.projectionMatrix && camera.matrixWorldInverse) {
      if (typeof camera.updateMatrixWorld === 'function') camera.updateMatrixWorld();
      this.#projScreen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.#frustum.setFromProjectionMatrix(this.#projScreen);
      frustumReady = true;
    }

    for (let i = 0; i < this.#tiles.length; i++) {
      const t = this.#tiles[i];
      if (!t.group) continue;
      const dx = cameraPos.x - t.cx;
      const dz = cameraPos.z - t.cz;
      const distSq = dx * dx + dz * dz;
      if (distSq > maxDSq) {
        if (t.group.visible) t.group.visible = false;
        this.#setTileCastShadow(t, false);
        continue;
      }
      let vis = true;
      if (frustumReady) {
        this.#minV.set(t.minX, TILE_Y_MIN, t.minZ);
        this.#maxV.set(t.maxX, TILE_Y_MAX, t.maxZ);
        this.#tmpBox.set(this.#minV, this.#maxV);
        vis = this.#frustum.intersectsBox(this.#tmpBox);
      }
      if (t.group.visible !== vis) t.group.visible = vis;

      const shadowDist = quality.shadowCasterDistance ?? 48;
      this.#setTileCastShadow(t, vis && distSq <= shadowDist * shadowDist);
    }
  }

  static #setTileCastShadow(t, cast) {
    const kids = t.group.children;
    for (let c = 0; c < kids.length; c++) {
      const mesh = kids[c];
      if (!mesh || !mesh.isMesh) continue;
      mesh.receiveShadow = true;
      mesh.castShadow = !!mesh.userData.castShadowWhenNear && cast;
    }
  }
}
