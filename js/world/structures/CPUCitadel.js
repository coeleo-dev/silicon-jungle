/**
 * CPUCitadel — Cidadela do Soquete CPU (LGA-1151)
 * Interior transitável com sala do trono, pilares de pinos dourados e dissipador superior.
 */
import { scene, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';

export class CPUCitadel {
  static build(x, z, animatedStructures = []) {
    const y = worldService.getHeight(x, z);
    const group = new THREE.Group();

    const wallMat = TOON_MATERIALS.CONCRETE_BUNKER;
    const floorMat = TOON_MATERIALS.DIAMOND_PLATE_FLOOR;
    const goldPinMat = createCelMaterial(0xf59e0b);
    const heatsinkMat = TOON_MATERIALS.METAL_PLATES_IO;

    // 1. Piso da Cidadela
    const floorGeo = new THREE.BoxGeometry(36, 1.2, 36);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = 0.6;
    floor.receiveShadow = true;
    group.add(floor);

    // 2. Paredes Externas
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(36, 14, 2), wallMat);
    wallN.position.set(0, 7.6, -17);
    wallN.castShadow = true; wallN.receiveShadow = true;
    group.add(wallN);

    const wallE = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 36), wallMat);
    wallE.position.set(17, 7.6, 0);
    wallE.castShadow = true; wallE.receiveShadow = true;
    group.add(wallE);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 36), wallMat);
    wallW.position.set(-17, 7.6, 0);
    wallW.castShadow = true; wallW.receiveShadow = true;
    group.add(wallW);

    const wallSLeft = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 2), wallMat);
    wallSLeft.position.set(-11, 7.6, 17);
    wallSLeft.castShadow = true; group.add(wallSLeft);

    const wallSRight = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 2), wallMat);
    wallSRight.position.set(11, 7.6, 17);
    wallSRight.castShadow = true; group.add(wallSRight);

    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 2), wallMat);
    doorHeader.position.set(0, 12.1, 17);
    group.add(doorHeader);

    // 3. Teto / Dissipador de Calor
    const roof = new THREE.Mesh(new THREE.BoxGeometry(38, 2, 38), heatsinkMat);
    roof.position.y = 15.6;
    roof.castShadow = true;
    group.add(roof);

    for (let i = -16; i <= 16; i += 4) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(36, 6, 0.4), heatsinkMat);
      fin.position.set(0, 19.6, i);
      fin.castShadow = true;
      group.add(fin);
    }

    // 4. Interior: Altar Central do Núcleo
    const dais = new THREE.Mesh(new THREE.CylinderGeometry(6, 6.8, 1.4, 8), TOON_MATERIALS.PAINTED_METAL);
    dais.position.set(0, 1.8, -4);
    dais.receiveShadow = true;
    group.add(dais);

    const throneHolo = new THREE.Mesh(new THREE.OctahedronGeometry(1.8, 0), new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true }));
    throneHolo.position.set(0, 4.5, -4);
    group.add(throneHolo);
    animatedStructures.push({ mesh: throneHolo, rotSpeed: 1.5 });

    // 5. Pilares Internos de Pinos Dourados
    [-10, 10].forEach(px => {
      [-8, 8].forEach(pz => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.9, 14, 12), goldPinMat);
        pillar.position.set(px, 7.6, pz);
        pillar.castShadow = true;
        group.add(pillar);

        worldService.addCollider({
          type: 'box',
          box: new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(x + px, y + 7.6, z + pz),
            new THREE.Vector3(2.0, 14, 2.0)
          )
        });
      });
    });

    const indoorLight = new THREE.PointLight(0x00ffaa, 1.8, 35);
    indoorLight.position.set(0, 10, 0);
    group.add(indoorLight);

    group.position.set(x, y, z);
    scene.add(group);

    // Colisores das Paredes
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 7.6, z - 17), new THREE.Vector3(36, 14, 2.5)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x + 17, y + 7.6, z), new THREE.Vector3(2.5, 14, 36)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x - 17, y + 7.6, z), new THREE.Vector3(2.5, 14, 36)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x - 11, y + 7.6, z + 17), new THREE.Vector3(14, 14, 2.5)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x + 11, y + 7.6, z + 17), new THREE.Vector3(14, 14, 2.5)) });

    // Colisor do Piso da Cidadela (topo do floor: y + 1.2)
    worldService.addCollider({
      type: 'floor',
      minX: x - 18,
      maxX: x + 18,
      minZ: z - 18,
      maxZ: z + 18,
      y: y + 1.2
    });

    return group;
  }
}
