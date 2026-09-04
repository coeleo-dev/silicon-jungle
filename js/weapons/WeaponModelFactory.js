/**
 * WeaponModelFactory — Silhuetas procedurais toon (D1/D2).
 * Offsets first-person iguais aos modelos anteriores.
 */
import { TOON_MATERIALS } from '../core/textures.js?v=20260824';

function addBox(group, w, h, d, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function addCyl(group, rTop, rBot, len, x, y, z, mat, rotX = Math.PI / 2) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 10), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.x = rotX;
  group.add(mesh);
  return mesh;
}

export class WeaponModelFactory {
  static createKnifeModel() {
    const group = new THREE.Group();
    const polymer = TOON_MATERIALS.WEAPON_POLYMER;
    const steel = TOON_MATERIALS.WEAPON_STEEL;
    const neon = TOON_MATERIALS.WEAPON_NEON;

    addCyl(group, 0.045, 0.055, 0.28, 0, 0, 0.08, polymer, 0);
    addBox(group, 0.14, 0.04, 0.08, 0, 0, -0.08, neon);
    addBox(group, 0.025, 0.11, 0.72, 0, 0.02, -0.48, steel);
    addBox(group, 0.018, 0.02, 0.72, 0.012, 0.03, -0.48, neon);

    group.position.set(0.42, -0.32, -0.75);
    group.rotation.set(0.15, -0.2, 0.1);
    group.visible = false;
    return group;
  }

  static createFlashlightModel() {
    const group = new THREE.Group();
    const polymer = TOON_MATERIALS.WEAPON_POLYMER;
    const steel = TOON_MATERIALS.WEAPON_STEEL;
    const neon = TOON_MATERIALS.WEAPON_NEON;

    addCyl(group, 0.055, 0.062, 0.72, 0, 0, 0.06, polymer);
    addCyl(group, 0.09, 0.06, 0.16, 0, 0, -0.38, steel);
    addCyl(group, 0.08, 0.08, 0.04, 0, 0, -0.48, neon);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
    lens.position.set(0, 0, -0.51);
    group.add(lens);
    addBox(group, 0.03, 0.08, 0.12, 0.07, 0, 0.1, steel);

    group.position.set(0.38, -0.35, -0.75);
    group.rotation.set(0.08, -0.1, 0);
    group.visible = false;
    return group;
  }

  static createPistolModel() {
    const group = new THREE.Group();
    const polymer = TOON_MATERIALS.WEAPON_POLYMER;
    const steel = TOON_MATERIALS.WEAPON_STEEL;
    const neon = TOON_MATERIALS.WEAPON_NEON;

    addBox(group, 0.07, 0.22, 0.11, 0.01, -0.14, 0.06, polymer);
    addBox(group, 0.09, 0.11, 0.28, 0, 0.02, -0.02, polymer);
    addBox(group, 0.08, 0.06, 0.26, 0, 0.08, -0.04, steel);
    addCyl(group, 0.028, 0.032, 0.22, 0, 0.05, -0.28, steel);
    addCyl(group, 0.04, 0.03, 0.06, 0, 0.05, -0.40, neon);
    addBox(group, 0.02, 0.05, 0.04, 0, 0.14, 0.04, neon);

    group.position.set(0.46, -0.36, -0.85);
    group.rotation.set(0.1, -0.15, -0.06);
    group.visible = false;
    return group;
  }

  static createShotgunModel() {
    const group = new THREE.Group();
    const polymer = TOON_MATERIALS.WEAPON_POLYMER;
    const steel = TOON_MATERIALS.WEAPON_STEEL;
    const neon = TOON_MATERIALS.WEAPON_NEON;

    addBox(group, 0.07, 0.16, 0.28, -0.02, -0.02, 0.22, polymer);
    addBox(group, 0.1, 0.12, 0.32, 0, 0.03, -0.02, polymer);
    addCyl(group, 0.03, 0.03, 0.55, -0.035, 0.06, -0.42, steel);
    addCyl(group, 0.03, 0.03, 0.55, 0.035, 0.06, -0.42, steel);
    addBox(group, 0.12, 0.04, 0.08, 0, 0.1, -0.18, neon);
    addBox(group, 0.04, 0.07, 0.14, 0, -0.08, 0.05, steel);

    group.position.set(0.45, -0.38, -0.9);
    group.visible = false;
    return group;
  }

  static createRifleModel() {
    const group = new THREE.Group();
    const polymer = TOON_MATERIALS.WEAPON_POLYMER;
    const steel = TOON_MATERIALS.WEAPON_STEEL;
    const neon = TOON_MATERIALS.WEAPON_NEON;

    addBox(group, 0.06, 0.14, 0.26, -0.01, -0.04, 0.28, polymer);
    addBox(group, 0.08, 0.1, 0.34, 0, 0.02, 0.02, polymer);
    addCyl(group, 0.022, 0.026, 0.72, 0, 0.05, -0.48, steel);
    addBox(group, 0.04, 0.035, 0.22, 0, 0.1, -0.06, steel);
    addBox(group, 0.03, 0.04, 0.08, 0, 0.14, -0.12, neon);
    addBox(group, 0.05, 0.05, 0.05, 0, 0.05, -0.86, neon);

    group.position.set(0.42, -0.35, -0.95);
    group.visible = false;
    return group;
  }
}
