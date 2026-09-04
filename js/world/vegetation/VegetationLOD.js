/**
 * VegetationLOD — Nível de Detalhe por Distância para InstancedMesh
 * Dois meshes: detalhe perto (full) e geometria simples longe (simple, sem sombra).
 * Dirty-check inclui célula da câmera e yaw para não pular upload ao andar/olhar.
 */
import { camera } from '../../core/scene.js?v=20260821';
import { quality } from '../../config/quality.js?v=20260827';
import { isBehindCamera } from '../../utils/cameraCull.js?v=20260828';
import { instanceShouldCastShadow } from '../../utils/instanceShadow.js?v=20260828';

const _fwd = new THREE.Vector3();

export class LODInstanced {
  /**
   * @param {THREE.BufferGeometry} fullGeo
   * @param {THREE.BufferGeometry|null} simpleGeo
   * @param {THREE.Material} material
   * @param {number} maxInstances
   * @param {number} lod0Dist
   * @param {number} farDist
   * @param {object} shadowOpts  { castShadow, receiveShadow, isBush }
   */
  constructor(fullGeo, simpleGeo, material, maxInstances, lod0Dist = 80, farDist = 180, shadowOpts = {}) {
    this.lod0DistSq = lod0Dist * lod0Dist;
    this.farDistSq = farDist * farDist;
    this.data = [];
    this._frame = 0;
    this._lastSig = '';

    this.full = new THREE.InstancedMesh(fullGeo, material, maxInstances);
    this.simple = simpleGeo ? new THREE.InstancedMesh(simpleGeo, material, maxInstances) : null;

    const isBush = !!shadowOpts.isBush;
    const castShadow = instanceShouldCastShadow(shadowOpts.castShadow, isBush, quality.bushCastShadow);

    this.full.count = 0;
    this.full.castShadow = castShadow;
    this.full.receiveShadow = !!shadowOpts.receiveShadow;

    if (this.simple) {
      this.simple.count = 0;
      this.simple.castShadow = false;
      this.simple.receiveShadow = false;
    }
  }

  add(matrix, x, z) {
    this.data.push({ matrix, x, z });
  }

  addToScene(scene) {
    scene.add(this.full);
    if (this.simple) scene.add(this.simple);
  }

  update(playerX, playerZ, force = false) {
    if (!this.full) return;
    this._frame++;
    if (!force && this._frame % 4 !== 0) return;

    let fi = 0;
    let si = 0;
    const data = this.data;

    camera.getWorldDirection(_fwd);
    let fwdX = _fwd.x;
    let fwdZ = _fwd.z;
    const fwdLen = Math.hypot(fwdX, fwdZ) || 1;
    fwdX /= fwdLen;
    fwdZ /= fwdLen;

    for (let i = 0; i < data.length; i++) {
      const d = data[i];
      const dx = d.x - playerX;
      const dz = d.z - playerZ;
      const distSq = dx * dx + dz * dz;

      if (distSq > this.farDistSq) continue;
      if (isBehindCamera(dx, dz, fwdX, fwdZ, distSq)) continue;

      if (this.simple && distSq > this.lod0DistSq) {
        this.simple.setMatrixAt(si++, d.matrix);
      } else {
        this.full.setMatrixAt(fi++, d.matrix);
      }
    }

    const cellX = Math.floor(playerX / 8);
    const cellZ = Math.floor(playerZ / 8);
    const yawCell = Math.floor(Math.atan2(fwdX, fwdZ) / (Math.PI / 8));
    const sig = `${fi}|${si}|${cellX}|${cellZ}|${yawCell}`;
    if (!force && sig === this._lastSig) return;
    this._lastSig = sig;

    if (this.full.count !== fi) this.full.count = fi;
    this.full.instanceMatrix.needsUpdate = true;

    if (this.simple) {
      if (this.simple.count !== si) this.simple.count = si;
      this.simple.instanceMatrix.needsUpdate = true;
    }
  }

  updateFromCamera(force = false) {
    if (!this.full) return;
    const p = camera.position;
    this.update(p.x, p.z, force);
  }

  detach() {
    if (this.full && this.full.parent) this.full.parent.remove(this.full);
    if (this.simple && this.simple.parent) this.simple.parent.remove(this.simple);
  }

  /** Remove da cena. Não faz dispose de geometry/material partilhados. */
  disposeInstances() {
    this.detach();
    this.full = null;
    this.simple = null;
    this.data = [];
  }
}

