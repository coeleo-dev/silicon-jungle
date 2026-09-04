/**
 * BiomeDistributor — Distribuição Procedural Orgânica por Biomas
 * Posiciona instâncias vegetais perfeitamente fincadas no solo (sem bases flutuando) a 60 FPS.
 */
import { worldService } from '../../core/WorldService.js?v=20260821';
import { spatialExclusionService } from '../../core/SpatialExclusionService.js?v=20260821';
import { getBiomeAt } from '../biomeMap.js?v=20260904';
import { keepPlacement } from '../biomeVisuals.js?v=20260904';

const dummy = new THREE.Object3D();
const upVec = new THREE.Vector3(0, 1, 0);
const tempNormal = new THREE.Vector3();

export class BiomeDistributor {
  /**
   * Povoa uma zona com InstancedMesh
   */
  static populateZone({
    instMesh,
    count,
    minRadius,
    maxRadius,
    scaleRange = [0.85, 1.25],
    isPlainsOnly = false,
    groundSink = 0.35,
    exclusionRadius = 2.0,
    ignoredCategories = [],
    ignoreSidewalkBeyond = 0,
    onInstancePlaced = null,
    species = 'default'
  }) {
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 16) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // 1. Zonas de Exclusão Centralizadas (Prédios, Ruas, Calçadas, Portas, Carros, Safe Zone)
      let ignored = ignoredCategories;
      if (ignoreSidewalkBeyond > 0 && Math.hypot(x, z) > ignoreSidewalkBeyond) {
        ignored = ignoredCategories.concat('SIDEWALK');
      }
      if (!spatialExclusionService.isAvailable(x, z, exclusionRadius, ignored)) {
        continue;
      }

      if (!keepPlacement(getBiomeAt(x, z), species)) continue;

      const y = worldService.getHeight(x, z);
      const normal = worldService.getNormal(x, z);

      // Se for vegetação exclusiva de planície, não colocar em relevos montanhosos
      if (isPlainsOnly && Math.abs(y) > 2.5) continue;

      const scale = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);

      // Enterrar a base levemente no solo para garantir que raízes nunca fiquem flutuando
      dummy.position.set(x, y - (groundSink * scale), z);

      // Alinhamento botânico: árvores crescem primordialmente verticais com sutil inclinação ao relevo
      tempNormal.lerpVectors(upVec, normal, 0.2).normalize();
      dummy.quaternion.setFromUnitVectors(upVec, tempNormal);
      dummy.rotateY(Math.random() * Math.PI * 2);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      instMesh.setMatrixAt(placed, dummy.matrix);

      if (typeof onInstancePlaced === 'function') {
        onInstancePlaced(placed, x, y, z, scale, dummy);
      }

      placed++;
    }

    instMesh.count = placed;
    instMesh.instanceMatrix.needsUpdate = true;
    return placed;
  }

  /**
   * Amostra posições livres no solo (anel polar + isAvailable), retornando
   * {x, z} em vez de escrever em InstancedMesh. Usado pela colheita procedural.
   */
  static samplePositions({ count, minRadius, maxRadius, centerX = 0, centerZ = 0, exclusionRadius = 1.0, ignoredCategories = [], maxAttemptsMult = 16 }) {
    const positions = [];
    let attempts = 0;
    while (positions.length < count && attempts < count * maxAttemptsMult) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);
      const x = centerX + Math.cos(angle) * dist;
      const z = centerZ + Math.sin(angle) * dist;
      if (!spatialExclusionService.isAvailable(x, z, exclusionRadius, ignoredCategories)) continue;
      positions.push({ x, z });
    }
    return positions;
  }

  /**
   * Amostra pontos aleatórios num AABB (P13 — anel 600 m).
   */
  static sampleInBounds({
    minX,
    maxX,
    minZ,
    maxZ,
    count,
    exclusionRadius = 1.0,
    ignoredCategories = [],
    maxAttemptsMult = 16
  }) {
    const positions = [];
    let attempts = 0;
    const dx = maxX - minX;
    const dz = maxZ - minZ;
    while (positions.length < count && attempts < count * maxAttemptsMult) {
      attempts++;
      const x = minX + Math.random() * dx;
      const z = minZ + Math.random() * dz;
      if (!spatialExclusionService.isAvailable(x, z, exclusionRadius, ignoredCategories)) continue;
      if (!keepPlacement(getBiomeAt(x, z), 'default')) continue;
      positions.push({ x, z });
    }
    return positions;
  }
}
