/**
 * ATXBunker — Bunker do Conector ATX 24 Pinos
 */
import { scene, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';

export class ATXBunker {
  static build(x, z) {
    const y = worldService.getHeight(x, z);
    const group = new THREE.Group();

    const nylonMat = TOON_MATERIALS.CONCRETE_BUNKER;
    const floorMat = TOON_MATERIALS.DIAMOND_PLATE_FLOOR;
    const goldMat = createCelMaterial(0xf59e0b);

    // Estrutura Principal do Bunker (28m x 18m)
    const bunkerFloor = new THREE.Mesh(new THREE.BoxGeometry(28, 1.0, 18), floorMat);
    bunkerFloor.position.y = 0.5;
    bunkerFloor.receiveShadow = true;
    group.add(bunkerFloor);

    // Paredes
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(28, 7, 1.5), nylonMat);
    wallN.position.set(0, 4, -8.5); group.add(wallN);

    const wallS = new THREE.Mesh(new THREE.BoxGeometry(28, 7, 1.5), nylonMat);
    wallS.position.set(0, 4, 8.5); group.add(wallS);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 18), nylonMat);
    wallW.position.set(-13.5, 4, 0); group.add(wallW);

    const wallE1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 6.5), nylonMat);
    wallE1.position.set(13.5, 4, -5.5); group.add(wallE1);

    const wallE2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7, 6.5), nylonMat);
    wallE2.position.set(13.5, 4, 5.5); group.add(wallE2);

    // Teto com 24 orifícios de pinos ATX
    const roof = new THREE.Mesh(new THREE.BoxGeometry(30, 1.5, 20), nylonMat);
    roof.position.y = 8;
    group.add(roof);

    for (let row = -1; row <= 1; row += 2) {
      for (let col = -5; col <= 5; col++) {
        const pin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 1.4), goldMat);
        pin.position.set(col * 2.4, 9.5, row * 4.0);
        group.add(pin);
      }
    }

    const bunkerLight = new THREE.PointLight(0xf59e0b, 1.5, 25);
    bunkerLight.position.set(0, 6, 0);
    group.add(bunkerLight);

    group.position.set(x, y, z);
    scene.add(group);

    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 4, z - 8.5), new THREE.Vector3(28, 7, 2)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 4, z + 8.5), new THREE.Vector3(28, 7, 2)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x - 13.5, y + 4, z), new THREE.Vector3(2, 7, 18)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x + 13.5, y + 4, z - 5.5), new THREE.Vector3(2, 7, 7)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x + 13.5, y + 4, z + 5.5), new THREE.Vector3(2, 7, 7)) });

    // Colisor do Piso do Bunker (topo do bunkerFloor: y + 1.0)
    worldService.addCollider({
      type: 'floor',
      minX: x - 14,
      maxX: x + 14,
      minZ: z - 9,
      maxZ: z + 9,
      y: y + 1.0
    });

    return group;
  }
}
