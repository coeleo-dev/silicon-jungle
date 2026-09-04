/**
 * UnderstoryFactory — Fábrica de Vegetação Rasteira, Arbustos, Samambaias e Fungos
 */
import { createRealisticPalmFrond, mergeBufferGeometries } from './TreeFactory.js?v=20260821';

export class UnderstoryFactory {
  static createBushGeometry(radius = 4.2, numLeaves = 16) {
    const leaves = [];
    for (let i = 0; i < numLeaves; i++) {
      const isInner = (i % 2 === 0);
      const r = isInner ? radius * 0.75 : radius;
      const angle = (i / numLeaves) * Math.PI * 2;
      const leaf = createRealisticPalmFrond(r, r * 0.65, 5);
      leaf.rotateZ((Math.random() - 0.5) * 0.25);
      leaf.rotateY(angle);
      leaves.push(leaf);
    }
    return mergeBufferGeometries(leaves);
  }

  static createFernGeometry(radius = 2.8, numFronds = 12) {
    const fronds = [];
    for (let i = 0; i < numFronds; i++) {
      const angle = (i / numFronds) * Math.PI * 2;
      const frond = createRealisticPalmFrond(radius, radius * 0.55, 5);
      frond.rotateZ((Math.random() - 0.5) * 0.2);
      frond.rotateY(angle);
      fronds.push(frond);
    }
    return mergeBufferGeometries(fronds);
  }

  static createGrassClusterGeometry(radius = 1.8, numFronds = 8) {
    return this.createFernGeometry(radius, numFronds);
  }

  static createMushroomStemGeometry() {
    const stem = new THREE.CylinderGeometry(0.1, 0.18, 1.3, 6);
    stem.translate(0, 0.65, 0);
    return stem;
  }

  static createMushroomCapGeometry() {
    const cap = new THREE.ConeGeometry(0.65, 0.5, 8);
    cap.translate(0, 1.3, 0);
    return cap;
  }

  static createFlowerGeometry() {
    return this.createFernGeometry(1.6, 8);
  }
}
