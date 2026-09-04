/**
 * IOComplex — Complexo Industrial I/O
 * Galpão térreo, mezanino superior de escadas e antena de radar no terraço.
 */
import { scene } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { ioComplexStepBoxes } from './buildings/buildingColliders.js?v=20260821';

export class IOComplex {
  static build(x, z, animatedStructures = []) {
    const y = worldService.getHeight(x, z);
    const group = new THREE.Group();

    const metalWallMat = TOON_MATERIALS.METAL_PLATES_IO;
    const floorMat = TOON_MATERIALS.DIAMOND_PLATE_FLOOR;

    // Galpão Térreo
    const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(32, 1.0, 22), floorMat);
    groundFloor.position.y = 0.5;
    groundFloor.receiveShadow = true;
    group.add(groundFloor);

    // Mezanino Superior (Segundo Andar)
    const secondFloor = new THREE.Mesh(new THREE.BoxGeometry(28, 1.0, 18), floorMat);
    secondFloor.position.y = 7.5;
    secondFloor.receiveShadow = true;
    group.add(secondFloor);

    // Paredes
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(32, 14, 2), metalWallMat);
    wallN.position.set(0, 7, -10); group.add(wallN);

    const wallW = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 22), metalWallMat);
    wallW.position.set(-15, 7, 0); group.add(wallW);

    // Escada Metálica Interior
    for (let step = 0; step < 12; step++) {
      const stairStep = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.4, 0.9), floorMat);
      stairStep.position.set(-11, 0.6 + step * 0.58, -6 + step * 0.9);
      stairStep.receiveShadow = true;
      group.add(stairStep);
    }

    // Antena de Radar no Terraço
    const dish = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), metalWallMat);
    dish.position.set(8, 16.5, 0);
    dish.rotation.x = -Math.PI / 3;
    group.add(dish);
    animatedStructures.push({ mesh: dish, rotSpeed: 0.6 });

    group.position.set(x, y, z);
    scene.add(group);

    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, y + 7, z - 10), new THREE.Vector3(32, 14, 2.5)) });
    worldService.addCollider({ type: 'box', box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x - 15, y + 7, z), new THREE.Vector3(2.5, 14, 22)) });

    // Colisor do Piso Térreo (topo do groundFloor: y + 1.0)
    worldService.addCollider({
      type: 'floor',
      minX: x - 16,
      maxX: x + 16,
      minZ: z - 11,
      maxZ: z + 11,
      y: y + 1.0
    });

    // Colisor do Mezanino (topo do secondFloor: y + 8.0) — alcançável pela escada interna
    worldService.addCollider({
      type: 'floor',
      minX: x - 14,
      maxX: x + 14,
      minZ: z - 9,
      maxZ: z + 9,
      y: y + 8.0
    });

    const steps = ioComplexStepBoxes(x, y, z);
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      worldService.addCollider({
        type: 'box',
        box: new THREE.Box3(
          new THREE.Vector3(s.minX, s.minY, s.minZ),
          new THREE.Vector3(s.maxX, s.maxY, s.maxZ)
        )
      });
      worldService.addCollider({
        type: 'floor',
        minX: s.minX,
        maxX: s.maxX,
        minZ: s.minZ,
        maxZ: s.maxZ,
        y: s.floorY
      });
    }

    return group;
  }
}
