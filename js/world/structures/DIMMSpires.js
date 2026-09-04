/**
 * DIMMSpires — Cânion de Memória RAM & Cidadela de Slots (Dungeon Vertical)
 * Estrutura com passarelas douradas em múltiplos níveis, escadarias completas e lajes sólidas.
 */
import { scene, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { spawnPowerCore, spawnGroundClockCrystal } from '../collectibles.js?v=20260912';

export class DIMMSpires {
  static build(x, z) {
    const y = worldService.getHeight(x, z);
    const group = new THREE.Group();

    const ramMat = TOON_MATERIALS.METAL_PLATES_RAM;
    const concreteMat = TOON_MATERIALS.CONCRETE_BUNKER;
    const goldMat = createCelMaterial(0xf59e0b);
    const cyanLightMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const steelMat = TOON_MATERIALS.METAL_BRUSHED_STEEL;

    // 1. Base / Fundação do Soquete de Memória
    const baseGeo = new THREE.BoxGeometry(36, 1.2, 36);
    const baseMesh = new THREE.Mesh(baseGeo, concreteMat);
    baseMesh.position.y = 0.6;
    baseMesh.receiveShadow = true;
    group.add(baseMesh);

    // Colisor do Piso Principal da Cidadela
    worldService.addCollider({
      type: 'floor',
      minX: x - 18,
      maxX: x + 18,
      minZ: z - 18,
      maxZ: z + 18,
      y: y + 1.2
    });

    // 2. Quatro Torres de Módulos DIMM (Slots 1 a 4)
    const slotOffsetsX = [-12, -4, 4, 12];
    slotOffsetsX.forEach((ox) => {
      const slotGroup = new THREE.Group();

      // Pente de Memória
      const dimmMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 24, 30), ramMat);
      dimmMesh.position.y = 12;
      dimmMesh.castShadow = true;
      slotGroup.add(dimmMesh);

      // Pinos de Ouro na Base
      const goldPins = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.8, 30), goldMat);
      goldPins.position.y = 1.2;
      slotGroup.add(goldPins);

      // Linha de LEDs RGB no Topo
      const ledBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.4, 28), cyanLightMat);
      ledBar.position.y = 23.8;
      slotGroup.add(ledBar);

      slotGroup.position.set(ox, 0, 0);
      group.add(slotGroup);

      // Colisores das Torres de RAM
      worldService.addCollider({
        type: 'box',
        box: new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(x + ox, y + 12, z),
          new THREE.Vector3(1.8, 24, 30)
        )
      });
    });

    // 3. Passarelas Suspensas de Ouro (Tiers em y = 6m, 12m e 18m)
    const tiers = [
      { yLvl: 6.0, width: 28, depth: 4.5, posZ: 0 },
      { yLvl: 12.0, width: 28, depth: 4.5, posZ: 6 },
      { yLvl: 18.0, width: 28, depth: 5.5, posZ: -6 }
    ];

    tiers.forEach((t) => {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(t.width, 0.4, t.depth), goldMat);
      bridge.position.set(0, t.yLvl, t.posZ);
      bridge.castShadow = true; bridge.receiveShadow = true;
      group.add(bridge);

      // Guarda-corpo da passarela
      const railing = new THREE.Mesh(new THREE.BoxGeometry(t.width, 0.8, 0.1), steelMat);
      railing.position.set(0, t.yLvl + 0.5, t.posZ + t.depth / 2);
      group.add(railing);

      // Colisor da Passarela
      worldService.addCollider({
        type: 'floor',
        minX: x - t.width / 2,
        maxX: x + t.width / 2,
        minZ: z + t.posZ - t.depth / 2,
        maxZ: z + t.posZ + t.depth / 2,
        y: y + t.yLvl + 0.2
      });
    });

    // 4. Escadarias Transitáveis de Aço em Ziguezague
    const buildStaircase = (startX, startZ, startY, endY, dirZ) => {
      const stepCount = Math.floor((endY - startY) / 0.35);
      const stepD = 1.0;
      const stepW = 3.2;

      for (let s = 0; s < stepCount; s++) {
        const stepY = startY + s * 0.35;
        const stepZ = startZ + s * stepD * dirZ;

        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stepW, 0.35, stepD), steelMat);
        stepMesh.position.set(startX, stepY, stepZ);
        stepMesh.castShadow = true; stepMesh.receiveShadow = true;
        group.add(stepMesh);

        worldService.addCollider({
          type: 'floor',
          minX: x + startX - stepW / 2,
          maxX: x + startX + stepW / 2,
          minZ: z + stepZ - stepD / 2 - 0.2,
          maxZ: z + stepZ + stepD / 2 + 0.2,
          y: y + stepY + 0.18
        });
      }
    };

    // Lance 1: Do chão (y=1.2) até Tier 1 (y=6.0)
    buildStaircase(-8, -12, 1.2, 6.0, 1);

    // Lance 2: De Tier 1 (y=6.0) até Tier 2 (y=12.0)
    buildStaircase(8, 0, 6.0, 12.0, 1);

    // Lance 3: De Tier 2 (y=12.0) até Tier 3 (y=18.0)
    buildStaircase(-8, 6, 12.0, 18.0, -1);

    // 5. Recompensas e Células de Energia no Topo
    spawnPowerCore(x, z - 6);
    spawnGroundClockCrystal(x + 4, z + 6);
    spawnGroundClockCrystal(x - 4, z + 6);

    group.position.set(x, y, z);
    scene.add(group);

    return group;
  }
}
