import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { mergeBufferGeometries } from '../vegetation/TreeFactory.js?v=20260821';
import { InteriorPropsFactory } from './InteriorPropsFactory.js?v=20260821';
import { NeonSignFactory } from './NeonSignFactory.js?v=20260821';
import { BuildingHelper } from './buildings/BuildingHelper.js?v=20260824';
import { createCyberHardwareStore as buildCyberHardwareStore } from './recipes/cyberHardwareStore.js?v=20260904';

export class BuildingFactory {
  static #addWindowGrid(ironGeos, glassGeos, x, y, z, w, h, facingAxis = 'z') {
    BuildingHelper.addWindowGrid(ironGeos, glassGeos, x, y, z, w, h, facingAxis);
  }

  static #addHangingVines(vineGeos, x, y, z, length = 6.0) {
    BuildingHelper.addHangingVines(vineGeos, x, y, z, length);
  }

  static #addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height) {
    BuildingHelper.addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);
  }

  static #addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height) {
    BuildingHelper.addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
  }

  static #addFacadeKit(concreteGeos, ironGeos, opts) {
    BuildingHelper.addFacadeKit(concreteGeos, ironGeos, opts);
  }

  /**
   * 1. 🏬 Loja de Hardware e Componentes Destruída (Painéis Ciano Esmaltados + Vidro Quebrado + Lianas)
   */
  static createCyberHardwareStore(width = 18, depth = 18, height = 14) {
    return buildCyberHardwareStore(width, depth, height);
  }

  static createTechWorkshop(size = 16, height = 10) {
    const concreteGeos = [];
    const panelGeos = [];
    const ironGeos = [];
    const glassGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.2;
    const doorW = 5.5;
    const doorH = 4.2;

    const foundation = new THREE.BoxGeometry(size + 0.8, 7.5, size + 0.8);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(size, 0.45, size);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda da rampa enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.0, 4.0, 3.2);
    stepPlinth.translate(0, -1.8, size / 2 + 1.4);
    concreteGeos.push(stepPlinth);

    // Rampa de Acesso Chanfrada (Piso Transitável)
    const ramp = new THREE.BoxGeometry(doorW + 1.6, 0.35, 2.8);
    ramp.translate(0, 0.18, size / 2 + 1.4);
    concreteGeos.push(ramp);

    // Paredes Terracota
    const wallN = new THREE.BoxGeometry(size, height, wallThick);
    wallN.translate(0, height / 2, -size / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, size);
    wallE.translate(size / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, size);
    wallW.translate(-size / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (size - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-size / 2 + southSegW / 2, height / 2, size / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(size / 2 - southSegW / 2, height / 2, size / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, size / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    // Portão industrial em metal âmbar
    const rollGate = new THREE.BoxGeometry(doorW, 1.6, 0.2);
    rollGate.translate(0, doorH - 0.8, size / 2);
    panelGeos.push(rollGate);

    // Janelas
    this.#addWindowGrid(ironGeos, glassGeos, size / 2, height * 0.65, 0, size * 0.5, 2.2, 'x');
    this.#addWindowGrid(ironGeos, glassGeos, -size / 2, height * 0.65, 0, size * 0.5, 2.2, 'x');

    const warnSign = NeonSignFactory.createSign('warning', 5.5, 1.4);
    warnSign.position.set(0, doorH + 1.2, size / 2 + 0.3);
    group.add(warnSign);

    const floorColliders = [
      { minX: -size / 2, maxX: size / 2, minZ: -size / 2, maxZ: size / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: size / 2 - 0.4, maxZ: size / 2 + 3.0, y: 0.25 }
    ];

    const wallColliders = [
      { minX: -size / 2, maxX: size / 2, minZ: -size / 2, maxZ: -size / 2 + wallThick, minY: 0, maxY: height },
      { minX: size / 2 - wallThick, maxX: size / 2, minZ: -size / 2, maxZ: size / 2, minY: 0, maxY: height },
      { minX: -size / 2, maxX: -size / 2 + wallThick, minZ: -size / 2, maxZ: size / 2, minY: 0, maxY: height },
      { minX: -size / 2, maxX: -doorW / 2, minZ: size / 2 - wallThick, maxZ: size / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: size / 2, minZ: size / 2 - wallThick, maxZ: size / 2, minY: 0, maxY: height }
    ];

    // Escada de Incêndio / Acesso ao Telhado
    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, size, size, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, size, size, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width: size, depth: size, height, doorW, doorH, style: 'workshop' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedPanel = mergeBufferGeometries(panelGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedGlass = mergeBufferGeometries(glassGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.TERRACOTTA_CONCRETE);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    if (mergedPanel) {
      const panelMesh = new THREE.Mesh(mergedPanel, TOON_MATERIALS.AMBER_PANEL_METAL);
      panelMesh.castShadow = false;
      group.add(panelMesh);
    }

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = false;
    group.add(ironMesh);

    if (mergedGlass) {
      const glassMesh = new THREE.Mesh(mergedGlass, TOON_MATERIALS.SHATTERED_GLASS);
      group.add(glassMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(size - 3, size - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width: size + 2, depth: size + 3, height, wallColliders, floorColliders, doorW, doorH, geomWidth: size, geomDepth: size };
  }

  /**
   * 3. 🏢 Mega Arranha-Céu Corporativo (Concreto Obsidiana / Carbono + Escadarias Monumentais Transitáveis)
   */
  static createGrandTowerWithStairs(width = 24, depth = 24, height = 44) {
    const concreteGeos = [];
    const ironGeos = [];
    const glassGeos = [];
    const vineGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.6;
    const doorW = 5.2;
    const doorH = 5.2;

    const foundation = new THREE.BoxGeometry(width + 1.2, 7.5, depth + 1.2);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda da escadaria monumental enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 4.8, 4.2, 4.0);
    stepPlinth.translate(0, -1.8, depth / 2 + 1.8);
    concreteGeos.push(stepPlinth);

    // ESCADARIA MONUMENTAL FRONTAL NA CALÇADA (Degraus Transitáveis)
    const stepColliders = [];
    for (let stepIdx = 0; stepIdx < 4; stepIdx++) {
      const stepW = doorW + 4.0 - stepIdx * 0.6;
      const stepD = 1.0;
      const stepH = 0.25;
      const stepZ = depth / 2 + 3.0 - stepIdx * stepD;
      const stepY = stepIdx * stepH + 0.12;

      const st = new THREE.BoxGeometry(stepW, stepH, stepD);
      st.translate(0, stepY, stepZ);
      concreteGeos.push(st);

      stepColliders.push({
        minX: -stepW / 2,
        maxX: stepW / 2,
        minZ: stepZ - stepD / 2,
        maxZ: stepZ + stepD / 2,
        y: stepY + stepH / 2
      });
    }

    // Paredes Principais em Concreto Obsidiana
    const wallN = new THREE.BoxGeometry(width, height, wallThick);
    wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, depth);
    wallE.translate(width / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, depth);
    wallW.translate(-width / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (width - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-width / 2 + southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(width / 2 - southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    // Pilastras Monumentais
    [-width / 2 + 1, -doorW / 2 - 1.0, doorW / 2 + 1.0, width / 2 - 1].forEach(x => {
      const col = new THREE.BoxGeometry(1.2, height, 1.2);
      col.translate(x, height / 2, depth / 2 + 0.5);
      concreteGeos.push(col);
    });

    // Janelas nos andares superiores
    for (let floorY = 8; floorY < height - 6; floorY += 6) {
      [-width * 0.3, width * 0.3].forEach(x => {
        this.#addWindowGrid(ironGeos, glassGeos, x, floorY, depth / 2, 4.0, 3.2, 'z');
      });
      for (let z = -depth * 0.3; z <= depth * 0.3; z += 7.0) {
        this.#addWindowGrid(ironGeos, glassGeos, width / 2, floorY, z, 3.5, 3.0, 'x');
        this.#addWindowGrid(ironGeos, glassGeos, -width / 2, floorY, z, 3.5, 3.0, 'x');
      }
    }

    // Escadas de Incêndio Externas
    for (let fY = 4; fY < height * 0.7; fY += 4.5) {
      const platform = new THREE.BoxGeometry(2.4, 0.2, 3.5);
      platform.translate(width / 2 + 1.2, fY, -depth / 2 + 4.0);
      ironGeos.push(platform);

      const ladderStairs = new THREE.BoxGeometry(0.8, 4.6, 1.8);
      ladderStairs.rotateZ(-0.4);
      ladderStairs.translate(width / 2 + 1.2, fY + 2.2, -depth / 2 + 5.8);
      ironGeos.push(ladderStairs);
    }

    // Lianas penduradas
    this.#addHangingVines(vineGeos, -width / 2 + 2, 20, depth / 2 + 0.4, 8.0);
    this.#addHangingVines(vineGeos, width / 2 - 2, 14, depth / 2 + 0.4, 6.0);
    this.#addHangingVines(vineGeos, -width / 2 + 4, height - 1, depth / 2 + 0.35, 9.0);
    this.#addHangingVines(vineGeos, width / 2 - 5, height - 2, -depth / 2 - 0.2, 7.5);

    // Mezanino Interno
    const mezzanine = new THREE.BoxGeometry(width - 4, 0.4, depth * 0.45);
    mezzanine.translate(0, 5.5, -depth * 0.2);
    concreteGeos.push(mezzanine);

    // Outdoor Neon no Topo
    const billboard = NeonSignFactory.createRooftopBillboard(14, 5.5);
    billboard.position.set(0, height, 0);
    group.add(billboard);

    const lobbySign = NeonSignFactory.createSign('optics', 8.0, 1.8);
    lobbySign.position.set(0, doorH + 1.5, depth / 2 + 0.8);
    group.add(lobbySign);

    const floorColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 1.0, y: 0.45 },
      ...stepColliders,
      { minX: -doorW / 2 - 2.0, maxX: doorW / 2 + 2.0, minZ: depth / 2 + 1.5, maxZ: depth / 2 + 4.5, y: 0.20 }
    ];

    const wallColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
      { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH, style: 'tower' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedGlass = mergeBufferGeometries(glassGeos);
    const mergedVines = mergeBufferGeometries(vineGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.OBSIDIAN_CONCRETE);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.METAL_PLATES_IO);
    ironMesh.castShadow = false; ironMesh.receiveShadow = true;
    group.add(ironMesh);

    if (mergedGlass) {
      const glassMesh = new THREE.Mesh(mergedGlass, TOON_MATERIALS.SHATTERED_GLASS);
      group.add(glassMesh);
    }

    if (mergedVines) {
      const vineMesh = new THREE.Mesh(mergedVines, TOON_MATERIALS.HANGING_VINES);
      group.add(vineMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(width - 3, depth - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width: width + 4, depth: depth + 5, height, wallColliders, floorColliders, doorW, doorH, geomWidth: width, geomDepth: depth };
  }

  /**
   * 4. 🛍️ Galeria Comercial de Silício (PCB Galleria & Arcade)
   */
  static createOvergrownMall(width = 22, depth = 26, height = 16) {
    const concreteGeos = [];
    const ironGeos = [];
    const glassGeos = [];
    const vineGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.4;
    const doorW = 5.2;
    const doorH = 4.5;

    const foundation = new THREE.BoxGeometry(width + 1.0, 7.5, depth + 1.0);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda dos degraus enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.5, 4.0, 3.2);
    stepPlinth.translate(0, -1.8, depth / 2 + 1.25);
    concreteGeos.push(stepPlinth);

    const step1 = new THREE.BoxGeometry(doorW + 2.0, 0.35, 1.4);
    step1.translate(0, 0.15, depth / 2 + 1.6);
    concreteGeos.push(step1);

    const step2 = new THREE.BoxGeometry(doorW + 2.5, 0.25, 1.4);
    step2.translate(0, 0.05, depth / 2 + 2.8);
    concreteGeos.push(step2);

    const wallN = new THREE.BoxGeometry(width, height, wallThick);
    wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, depth);
    wallE.translate(width / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, depth);
    wallW.translate(-width / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (width - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-width / 2 + southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(width / 2 - southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    this.#addWindowGrid(ironGeos, glassGeos, -width * 0.28, 7.5, depth / 2, 4.0, 3.2, 'z');
    this.#addWindowGrid(ironGeos, glassGeos, width * 0.28, 7.5, depth / 2, 4.0, 3.2, 'z');
    this.#addWindowGrid(ironGeos, glassGeos, -width * 0.28, 12.5, depth / 2, 4.0, 3.2, 'z');
    this.#addWindowGrid(ironGeos, glassGeos, width * 0.28, 12.5, depth / 2, 4.0, 3.2, 'z');

    this.#addHangingVines(vineGeos, -width * 0.35, height - 1, depth / 2 + 0.2, 8.0);
    this.#addHangingVines(vineGeos, width * 0.35, height - 1, depth / 2 + 0.2, 6.5);
    this.#addHangingVines(vineGeos, 0, height - 1, depth / 2 + 0.2, 5.0);
    this.#addHangingVines(vineGeos, -width * 0.2, height, -depth / 2 - 0.15, 8.5);
    this.#addHangingVines(vineGeos, width * 0.45, height - 2, depth / 2 + 0.25, 7.0);

    const mallSign = NeonSignFactory.createSign('galleria', 8.5, 2.0);
    mallSign.position.set(0, doorH + 1.8, depth / 2 + 0.3);
    group.add(mallSign);

    const floorColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: depth / 2 - 0.4, maxZ: depth / 2 + 3.0, y: 0.25 }
    ];

    const wallColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
      { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH, style: 'shop' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedGlass = mergeBufferGeometries(glassGeos);
    const mergedVines = mergeBufferGeometries(vineGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.CONCRETE_BUNKER);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = false;
    group.add(ironMesh);

    if (mergedGlass) {
      const glassMesh = new THREE.Mesh(mergedGlass, TOON_MATERIALS.SHATTERED_GLASS);
      group.add(glassMesh);
    }

    if (mergedVines) {
      const vineMesh = new THREE.Mesh(mergedVines, TOON_MATERIALS.HANGING_VINES);
      group.add(vineMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(width - 3, depth - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width, depth: depth + 3, height, wallColliders, floorColliders, doorW, doorH, geomWidth: width, geomDepth: depth };
  }

  /**
   * 5. Torre Monolito de Microchip (DIP Chip Tower)
   */
  static createDIPChipTower(width = 18, depth = 26, height = 24) {
    const concreteGeos = [];
    const ironGeos = [];
    const glassGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.4;
    const doorW = 5.0;
    const doorH = 4.5;

    const foundation = new THREE.BoxGeometry(width + 0.8, 7.5, depth + 0.8);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda dos degraus enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.5, 4.0, 3.2);
    stepPlinth.translate(0, -1.8, depth / 2 + 1.25);
    concreteGeos.push(stepPlinth);

    const step1 = new THREE.BoxGeometry(doorW + 1.8, 0.35, 1.4);
    step1.translate(0, 0.15, depth / 2 + 1.5);
    concreteGeos.push(step1);

    const wallN = new THREE.BoxGeometry(width, height, wallThick);
    wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, depth);
    wallE.translate(width / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, depth);
    wallW.translate(-width / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (width - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-width / 2 + southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(width / 2 - southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    for (let fY = 7; fY < height - 4; fY += 5.5) {
      this.#addWindowGrid(ironGeos, glassGeos, -width * 0.28, fY, depth / 2, 3.2, 2.4, 'z');
      this.#addWindowGrid(ironGeos, glassGeos, width * 0.28, fY, depth / 2, 3.2, 2.4, 'z');
    }

    for (let z = -depth / 2 + 3; z <= depth / 2 - 3; z += 4.0) {
      [-1, 1].forEach(side => {
        const pillar = new THREE.BoxGeometry(0.8, height - 2, 0.8);
        pillar.translate(side * (width / 2 + 0.3), height / 2, z);
        ironGeos.push(pillar);
      });
    }

    const canopy = new THREE.BoxGeometry(doorW + 1.6, 0.4, 2.5);
    canopy.translate(0, doorH + 0.2, depth / 2 + 1.25);
    ironGeos.push(canopy);

    const sign = NeonSignFactory.createSign('hardware', 6.5, 1.6);
    sign.position.set(0, doorH + 1.6, depth / 2 + 0.3);
    group.add(sign);

    const floorColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: depth / 2 - 0.4, maxZ: depth / 2 + 2.5, y: 0.25 }
    ];

    const wallColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
      { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH, style: 'tower' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedGlass = mergeBufferGeometries(glassGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.OBSIDIAN_CONCRETE);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.METAL_BRUSHED_STEEL);
    ironMesh.castShadow = false; ironMesh.receiveShadow = true;
    group.add(ironMesh);

    if (mergedGlass) {
      const glassMesh = new THREE.Mesh(mergedGlass, TOON_MATERIALS.SHATTERED_GLASS);
      group.add(glassMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(width - 3, depth - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width, depth, height, wallColliders, floorColliders, doorW, doorH, geomWidth: width, geomDepth: depth };
  }

  /**
   * 6. Arranha-Céu Dissipador de Calor (Heatsink Skyscraper)
   */
  static createHeatsinkSkyscraper(width = 22, depth = 22, height = 38) {
    const concreteGeos = [];
    const ironGeos = [];
    const glassGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.4;
    const doorW = 5.0;
    const doorH = 4.8;

    const foundation = new THREE.BoxGeometry(width + 1.0, 7.5, depth + 1.0);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda dos degraus enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.5, 4.0, 3.2);
    stepPlinth.translate(0, -1.8, depth / 2 + 1.25);
    concreteGeos.push(stepPlinth);

    const step1 = new THREE.BoxGeometry(doorW + 1.8, 0.35, 1.4);
    step1.translate(0, 0.15, depth / 2 + 1.5);
    concreteGeos.push(step1);

    const wallN = new THREE.BoxGeometry(width, height, wallThick);
    wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, depth);
    wallE.translate(width / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, depth);
    wallW.translate(-width / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (width - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-width / 2 + southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(width / 2 - southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    const finCount = 5;
    for (let i = 0; i < finCount; i++) {
      const t = (i / (finCount - 1) - 0.5) * (depth * 0.75);
      const fin = new THREE.BoxGeometry(width + 3.0, height * 0.8, 0.5);
      fin.translate(0, height * 0.55, t);
      ironGeos.push(fin);
    }

    for (let fY = 8; fY < height - 6; fY += 6) {
      this.#addWindowGrid(ironGeos, glassGeos, -width * 0.28, fY, depth / 2, 3.5, 2.8, 'z');
      this.#addWindowGrid(ironGeos, glassGeos, width * 0.28, fY, depth / 2, 3.5, 2.8, 'z');
    }

    const sign = NeonSignFactory.createSign('cooling', 7.5, 1.8);
    sign.position.set(0, doorH + 1.8, depth / 2 + 0.3);
    group.add(sign);

    const floorColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: depth / 2 - 0.4, maxZ: depth / 2 + 3.0, y: 0.3 }
    ];

    const wallColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
      { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH, style: 'tower' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedGlass = mergeBufferGeometries(glassGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.OBSIDIAN_CONCRETE);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.METAL_PLATES_IO);
    ironMesh.castShadow = false; ironMesh.receiveShadow = true;
    group.add(ironMesh);

    if (mergedGlass) {
      const glassMesh = new THREE.Mesh(mergedGlass, TOON_MATERIALS.SHATTERED_GLASS);
      group.add(glassMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(width - 3, depth - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width, depth, height, wallColliders, floorColliders, doorW, doorH, geomWidth: width, geomDepth: depth };
  }

  /**
   * 7. Silo Tubular de Capacitor
   */
  static createCapacitorSilo(radius = 8.5, height = 22) {
    const concreteGeos = [];
    const ironGeos = [];
    const group = new THREE.Group();
    const doorW = 5.0;

    const foundation = new THREE.CylinderGeometry(radius * 1.08, radius * 1.12, 7.5, 14);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.CylinderGeometry(radius, radius, 0.45, 14);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    const wallCyl = new THREE.CylinderGeometry(radius, radius * 1.05, height, 14, 1, true, 0.35, Math.PI * 2 - 0.7);
    wallCyl.translate(0, height / 2, 0);
    concreteGeos.push(wallCyl);

    for (let c = 5; c < height - 3; c += 6) {
      const ring = new THREE.TorusGeometry(radius + 0.2, 0.4, 6, 14);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, c, 0);
      ironGeos.push(ring);
    }

    const sign = NeonSignFactory.createSign('warning', 5.0, 1.4);
    sign.position.set(0, 5.5, radius + 0.4);
    group.add(sign);

    const floorColliders = [
      { minX: -radius, maxX: radius, minZ: -radius, maxZ: radius + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: radius * 0.5, maxZ: radius + 2.5, y: 0.25 }
    ];

    const wallColliders = [
      { minX: -radius, maxX: radius, minZ: -radius, maxZ: -radius * 0.5, minY: 0, maxY: height },
      { minX: radius * 0.5, maxX: radius, minZ: -radius * 0.5, maxZ: radius * 0.5, minY: 0, maxY: height },
      { minX: -radius, maxX: -radius * 0.5, minZ: -radius * 0.5, maxZ: radius * 0.5, minY: 0, maxY: height },
      { minX: -radius, maxX: -doorW / 2, minZ: radius * 0.5, maxZ: radius, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: radius, minZ: radius * 0.5, maxZ: radius, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, radius * 2, radius * 2, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, radius * 2, radius * 2, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width: radius * 2, depth: radius * 2, height, doorW, doorH: 4.0, style: 'silo', radius });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.CONCRETE_BUNKER);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = false;
    group.add(ironMesh);

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(radius * 1.4, radius * 1.4);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width: radius * 2.2, depth: radius * 2.2, height, wallColliders, floorColliders, doorW, doorH: 4.0, geomWidth: radius * 2, geomDepth: radius * 2 };
  }

  /**
   * 8. Bloco Modular de Slots (Modular PCIe Complex)
   */
  static createModularSlotComplex(width = 24, depth = 16, height = 18) {
    const concreteGeos = [];
    const ironGeos = [];
    const glassGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.4;
    const doorW = 5.0;
    const doorH = 4.2;

    const foundation = new THREE.BoxGeometry(width + 0.8, 7.5, depth + 0.8);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda dos degraus enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.2, 4.0, 3.0);
    stepPlinth.translate(0, -1.8, depth / 2 + 1.2);
    concreteGeos.push(stepPlinth);

    const step = new THREE.BoxGeometry(doorW + 1.8, 0.35, 2.2);
    step.translate(0, 0.18, depth / 2 + 1.1);
    concreteGeos.push(step);

    const wallN = new THREE.BoxGeometry(width, height, wallThick);
    wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, depth);
    wallE.translate(width / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, depth);
    wallW.translate(-width / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (width - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-width / 2 + southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(width / 2 - southSegW / 2, height / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    this.#addWindowGrid(ironGeos, glassGeos, -width * 0.28, 7.5, depth / 2, 4.0, 3.0, 'z');
    this.#addWindowGrid(ironGeos, glassGeos, width * 0.28, 7.5, depth / 2, 4.0, 3.0, 'z');

    const canopy = new THREE.BoxGeometry(doorW + 2.0, 0.5, 3.5);
    canopy.translate(0, doorH + 0.25, depth / 2 + 1.75);
    ironGeos.push(canopy);

    const sign = NeonSignFactory.createSign('cybermart', 7.0, 1.8);
    sign.position.set(0, doorH + 1.8, depth / 2 + 0.3);
    group.add(sign);

    const floorColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: depth / 2 - 0.4, maxZ: depth / 2 + 2.8, y: 0.22 }
    ];

    const wallColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
      { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH, style: 'shop' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedGlass = mergeBufferGeometries(glassGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.CONCRETE_BUNKER);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = false;
    group.add(ironMesh);

    if (mergedGlass) {
      const glassMesh = new THREE.Mesh(mergedGlass, TOON_MATERIALS.SHATTERED_GLASS);
      group.add(glassMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(width - 3, depth - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width, depth: depth + 3, height, wallColliders, floorColliders, doorW, doorH, geomWidth: width, geomDepth: depth };
  }

  /**
   * 9. Subestação de Transformador
   */
  static createTransformerBlock(size = 14, height = 14) {
    const concreteGeos = [];
    const ironGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.2;
    const doorW = 5.0;
    const doorH = 3.8;

    const foundation = new THREE.BoxGeometry(size + 0.6, 7.5, size + 0.6);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(size, 0.45, size);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    // Sapata profunda dos degraus enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.0, 4.0, 3.0);
    stepPlinth.translate(0, -1.8, size / 2 + 1.1);
    concreteGeos.push(stepPlinth);

    const step = new THREE.BoxGeometry(doorW + 1.6, 0.35, 2.0);
    step.translate(0, 0.18, size / 2 + 1.0);
    concreteGeos.push(step);

    const wallN = new THREE.BoxGeometry(size, height, wallThick);
    wallN.translate(0, height / 2, -size / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height, size);
    wallE.translate(size / 2 - wallThick / 2, height / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height, size);
    wallW.translate(-size / 2 + wallThick / 2, height / 2, 0);
    concreteGeos.push(wallW);

    const southSegW = (size - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSLeft.translate(-size / 2 + southSegW / 2, height / 2, size / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height, wallThick);
    wallSRight.translate(size / 2 - southSegW / 2, height / 2, size / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const doorHeader = new THREE.BoxGeometry(doorW, height - doorH, wallThick);
    doorHeader.translate(0, doorH + (height - doorH) / 2, size / 2 - wallThick / 2);
    concreteGeos.push(doorHeader);

    [Math.PI / 2, (Math.PI * 3) / 2].forEach(angle => {
      const radiator = new THREE.BoxGeometry(size * 0.6, height * 0.5, 1.2);
      radiator.rotateY(angle);
      radiator.translate(Math.sin(angle) * (size / 2 + 0.6), height * 0.45, Math.cos(angle) * (size / 2 + 0.6));
      ironGeos.push(radiator);
    });

    const sign = NeonSignFactory.createSign('warning', 4.5, 1.4);
    sign.position.set(0, doorH + 1.2, size / 2 + 0.3);
    group.add(sign);

    const floorColliders = [
      { minX: -size / 2, maxX: size / 2, minZ: -size / 2, maxZ: size / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: size / 2 - 0.4, maxZ: size / 2 + 2.8, y: 0.22 }
    ];

    const wallColliders = [
      { minX: -size / 2, maxX: size / 2, minZ: -size / 2, maxZ: -size / 2 + wallThick, minY: 0, maxY: height },
      { minX: size / 2 - wallThick, maxX: size / 2, minZ: -size / 2, maxZ: size / 2, minY: 0, maxY: height },
      { minX: -size / 2, maxX: -size / 2 + wallThick, minZ: -size / 2, maxZ: size / 2, minY: 0, maxY: height },
      { minX: -size / 2, maxX: -doorW / 2, minZ: size / 2 - wallThick, maxZ: size / 2, minY: 0, maxY: height },
      { minX: doorW / 2, maxX: size / 2, minZ: size / 2 - wallThick, maxZ: size / 2, minY: 0, maxY: height }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, size, size, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, size, size, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width: size, depth: size, height, doorW, doorH, style: 'workshop' });

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.TERRACOTTA_CONCRETE);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = false;
    group.add(ironMesh);

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(size - 3, size - 3);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width: size + 2, depth: size + 2, height, wallColliders, floorColliders, doorW, doorH, geomWidth: size, geomDepth: size };
  }

  /**
   * 10. Edifício Desabado Invadido por Árvore (Overgrown Ruin)
   */
  static createOvergrownRuin(width = 20, depth = 20, height = 18) {
    const concreteGeos = [];
    const ironGeos = [];
    const vineGeos = [];
    const group = new THREE.Group();
    const wallThick = 1.4;
    const doorW = 5.0;

    const foundation = new THREE.BoxGeometry(width + 0.8, 7.5, depth + 0.8);
    foundation.translate(0, -3.75, 0);
    concreteGeos.push(foundation);

    const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
    floorSlab.translate(0, 0.22, 0);
    concreteGeos.push(floorSlab);

    const wallN = new THREE.BoxGeometry(width, height, wallThick);
    wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
    concreteGeos.push(wallN);

    const wallE = new THREE.BoxGeometry(wallThick, height * 0.55, depth);
    wallE.translate(width / 2 - wallThick / 2, (height * 0.55) / 2, 0);
    concreteGeos.push(wallE);

    const wallW = new THREE.BoxGeometry(wallThick, height * 0.8, depth * 0.6);
    wallW.translate(-width / 2 + wallThick / 2, (height * 0.8) / 2, -depth * 0.2);
    concreteGeos.push(wallW);

    const southSegW = (width - doorW) / 2;
    const wallSLeft = new THREE.BoxGeometry(southSegW, height * 0.7, wallThick);
    wallSLeft.translate(-width / 2 + southSegW / 2, (height * 0.7) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSLeft);

    const wallSRight = new THREE.BoxGeometry(southSegW, height * 0.7, wallThick);
    wallSRight.translate(width / 2 - southSegW / 2, (height * 0.7) / 2, depth / 2 - wallThick / 2);
    concreteGeos.push(wallSRight);

    const collapsedBeam = new THREE.BoxGeometry(1.2, 0.8, 14.0);
    collapsedBeam.rotateX(0.35);
    collapsedBeam.rotateY(0.2);
    collapsedBeam.translate(2, 6, 2);
    ironGeos.push(collapsedBeam);

    // Sapata profunda dos degraus enterrada no solo
    const stepPlinth = new THREE.BoxGeometry(doorW + 2.4, 4.0, 3.0);
    stepPlinth.translate(0, -1.8, depth / 2 + 1.2);
    concreteGeos.push(stepPlinth);

    const step = new THREE.BoxGeometry(doorW + 1.8, 0.35, 2.0);
    step.translate(0, 0.18, depth / 2 + 1.0);
    concreteGeos.push(step);

    const floorColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 0.6, y: 0.45 },
      { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: depth / 2 - 0.4, maxZ: depth / 2 + 2.8, y: 0.22 }
    ];

    const wallColliders = [
      { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
      { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height * 0.55 },
      { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth * 0.1, minY: 0, maxY: height * 0.8 },
      { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height * 0.7 },
      { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height * 0.7 }
    ];

    this.#addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

    this.#addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
    this.#addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH: 4.0, style: 'ruin' });

    this.#addHangingVines(vineGeos, -width * 0.3, height - 1, depth / 2 + 0.3, 9.0);
    this.#addHangingVines(vineGeos, width * 0.25, height - 2, depth / 2 + 0.25, 8.0);
    this.#addHangingVines(vineGeos, 0, height, -depth / 2 - 0.2, 7.0);
    this.#addHangingVines(vineGeos, -width / 2 + 1.5, height * 0.6, depth / 2 + 0.3, 6.5);

    const mergedConcrete = mergeBufferGeometries(concreteGeos);
    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedVines = mergeBufferGeometries(vineGeos);

    const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.CONCRETE_BUNKER);
    concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
    group.add(concreteMesh);

    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = false;
    group.add(ironMesh);

    if (mergedVines) {
      const vineMesh = new THREE.Mesh(mergedVines, TOON_MATERIALS.HANGING_VINES);
      group.add(vineMesh);
    }

    const interiorProps = InteriorPropsFactory.createOfficeLobbyProps(width - 4, depth - 4);
    interiorProps.position.y = 0.45;
    interiorProps.visible = false;
    group.add(interiorProps);
    return { group, interiorProps, width, depth, height, wallColliders, floorColliders, doorW, doorH: 4.0, geomWidth: width, geomDepth: depth };
  }
}
