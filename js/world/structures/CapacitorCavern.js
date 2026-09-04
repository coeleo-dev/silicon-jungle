/**
 * CapacitorCavern — Caverna do Capacitor Eletrolítico Rompido
 */
import { scene, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';

export class CapacitorCavern {
  static build(x, z) {
    const y = worldService.getHeight(x, z);
    const group = new THREE.Group();

    const canMat = TOON_MATERIALS.METAL_PLATES_IO;
    const foilMat = TOON_MATERIALS.PAINTED_METAL;

    // Casca Externa do Capacitor Cilíndrico (Raio 7m, Altura 16m)
    const canGeo = new THREE.CylinderGeometry(7, 7.5, 16, 16, 1, true);
    const canMesh = new THREE.Mesh(canGeo, canMat);
    canMesh.position.y = 8;
    canMesh.material.side = THREE.DoubleSide;
    canMesh.castShadow = true;
    group.add(canMesh);

    // Faixa de Polaridade Negativa
    const bandGeo = new THREE.CylinderGeometry(7.05, 7.55, 3.5, 16, 1, true);
    const band = new THREE.Mesh(bandGeo, createCelMaterial(0xe2e8f0));
    band.position.y = 8;
    band.material.side = THREE.DoubleSide;
    group.add(band);

    // Folhas de Eletrólito Internas
    const foilGeo = new THREE.TorusGeometry(5.2, 0.8, 8, 24, Math.PI * 1.5);
    const foil = new THREE.Mesh(foilGeo, foilMat);
    foil.position.set(0, 4, 0);
    foil.rotation.x = Math.PI / 2;
    group.add(foil);

    const capLight = new THREE.PointLight(0x00f0ff, 0.22, 9);
    capLight.position.set(0, 7, 0);
    group.add(capLight);

    group.position.set(x, y, z);
    scene.add(group);

    worldService.addCollider({
      type: 'cylinder',
      center: new THREE.Vector3(x, y + 8, z),
      radius: 7.2,
      height: 16
    });

    return group;
  }
}
