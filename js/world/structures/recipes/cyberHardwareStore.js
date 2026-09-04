/**
 * Recipe: loja de hardware cyber (A8).
 * Extraída de BuildingFactory.createCyberHardwareStore.
 */
import { TOON_MATERIALS } from '../../../core/textures.js?v=20260821';
import { mergeBufferGeometries } from '../../vegetation/TreeFactory.js?v=20260821';
import { InteriorPropsFactory } from '../InteriorPropsFactory.js?v=20260821';
import { NeonSignFactory } from '../NeonSignFactory.js?v=20260821';
import { BuildingHelper } from '../buildings/BuildingHelper.js?v=20260824';

export function createCyberHardwareStore(width = 18, depth = 18, height = 14) {
  const concreteGeos = [];
  const panelGeos = [];
  const ironGeos = [];
  const glassGeos = [];
  const vineGeos = [];
  const group = new THREE.Group();
  const wallThick = 1.2;
  const doorW = 5.0;
  const doorH = 4.0;

  // Fundação 3.2m enterrada
  const foundation = new THREE.BoxGeometry(width + 0.8, 7.5, depth + 0.8);
  foundation.translate(0, -3.75, 0);
  concreteGeos.push(foundation);

  // Piso interno sólido
  const floorSlab = new THREE.BoxGeometry(width, 0.45, depth);
  floorSlab.translate(0, 0.22, 0);
  concreteGeos.push(floorSlab);

  // Sapata profunda dos degraus enterrada no solo
  const stepPlinth = new THREE.BoxGeometry(doorW + 2.6, 4.0, 3.2);
  stepPlinth.translate(0, -1.8, depth / 2 + 1.2);
  concreteGeos.push(stepPlinth);

  // Degraus da calçada (Piso Transitável)
  const step1 = new THREE.BoxGeometry(doorW + 2.2, 0.35, 1.4);
  step1.translate(0, 0.15, depth / 2 + 1.6);
  concreteGeos.push(step1);

  const step2 = new THREE.BoxGeometry(doorW + 1.6, 0.30, 1.2);
  step2.translate(0, 0.35, depth / 2 + 0.6);
  concreteGeos.push(step2);

  // Paredes Perimetrais
  const wallN = new THREE.BoxGeometry(width, height, wallThick);
  wallN.translate(0, height / 2, -depth / 2 + wallThick / 2);
  concreteGeos.push(wallN);

  // Paredes Leste e Oeste com Painéis Ciano Esmaltados
  [-1, 1].forEach(side => {
    const wallSide = new THREE.BoxGeometry(wallThick, height, depth);
    wallSide.translate(side * (width / 2 - wallThick / 2), height / 2, 0);
    concreteGeos.push(wallSide);

    const panel = new THREE.BoxGeometry(0.15, height * 0.7, depth * 0.85);
    panel.translate(side * (width / 2 + 0.08), height * 0.5, 0);
    panelGeos.push(panel);
  });

  // Fachada Frontal (Sul)
  const sideW = (width - doorW) / 2;
  const topBeam = new THREE.BoxGeometry(width, height - 5.0, wallThick);
  topBeam.translate(0, 5.0 + (height - 5.0) / 2, depth / 2 - wallThick / 2);
  concreteGeos.push(topBeam);

  // Vitrines de vidro quebrado nas laterais
  [-1, 1].forEach(side => {
    const vx = side * (doorW / 2 + sideW / 2);
    BuildingHelper.addWindowGrid(ironGeos, glassGeos, vx, 2.6, depth / 2, sideW * 0.85, 3.8, 'z');
  });

  // Marquise
  const canopy = new THREE.BoxGeometry(doorW + 2.4, 0.45, 3.2);
  canopy.translate(0, doorH + 0.3, depth / 2 + 1.6);
  ironGeos.push(canopy);

  // Lianas e trepadeiras descendo da marquise e do telhado
  BuildingHelper.addHangingVines(vineGeos, -width * 0.3, doorH + 0.2, depth / 2 + 1.5, 3.5);
  BuildingHelper.addHangingVines(vineGeos, width * 0.3, height, depth / 2 + 0.2, 5.0);
  BuildingHelper.addHangingVines(vineGeos, -width * 0.15, height - 0.5, depth / 2 + 0.25, 7.0);
  BuildingHelper.addHangingVines(vineGeos, width * 0.45, height - 1.2, -depth / 2 - 0.15, 6.0);
  BuildingHelper.addHangingVines(vineGeos, 0, height, depth / 2 + 0.2, 4.5);

  // Letreiro Luminoso Neon
  const storeSign = NeonSignFactory.createSign('hardware', 8.5, 2.0);
  storeSign.position.set(0, doorH + 2.0, depth / 2 + 0.35);
  group.add(storeSign);

  // Array de Colisores de Piso Transitáveis (Piso Interno Contínuo + Degraus em Cascata)
  const floorColliders = [
    { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2 + 0.6, y: 0.45 },
    { minX: -doorW / 2 - 1.2, maxX: doorW / 2 + 1.2, minZ: depth / 2 - 0.4, maxZ: depth / 2 + 1.8, y: 0.35 },
    { minX: -doorW / 2 - 1.5, maxX: doorW / 2 + 1.5, minZ: depth / 2 + 0.8, maxZ: depth / 2 + 3.2, y: 0.20 }
  ];

  const wallColliders = [
    { minX: -width / 2, maxX: width / 2, minZ: -depth / 2, maxZ: -depth / 2 + wallThick, minY: 0, maxY: height },
    { minX: width / 2 - wallThick, maxX: width / 2, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
    { minX: -width / 2, maxX: -width / 2 + wallThick, minZ: -depth / 2, maxZ: depth / 2, minY: 0, maxY: height },
    { minX: -width / 2, maxX: -doorW / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height },
    { minX: doorW / 2, maxX: width / 2, minZ: depth / 2 - wallThick, maxZ: depth / 2, minY: 0, maxY: height }
  ];

  // Escada de Incêndio / Acesso ao Telhado
  BuildingHelper.addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height);

  BuildingHelper.addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height);
  BuildingHelper.addFacadeKit(concreteGeos, ironGeos, { width, depth, height, doorW, doorH, style: 'shop' });

  const mergedConcrete = mergeBufferGeometries(concreteGeos);
  const mergedPanel = mergeBufferGeometries(panelGeos);
  const mergedIron = mergeBufferGeometries(ironGeos);
  const mergedGlass = mergeBufferGeometries(glassGeos);
  const mergedVines = mergeBufferGeometries(vineGeos);

  const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.CONCRETE_BUNKER);
  concreteMesh.castShadow = true; concreteMesh.receiveShadow = true;
  group.add(concreteMesh);

  if (mergedPanel) {
    const panelMesh = new THREE.Mesh(mergedPanel, TOON_MATERIALS.CYAN_PANEL_METAL);
    panelMesh.castShadow = false;
    group.add(panelMesh);
  }

  const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
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
  return { group, interiorProps, width: width + 3, depth: depth + 3, height, wallColliders, floorColliders, doorW, doorH, geomWidth: width, geomDepth: depth };
}
