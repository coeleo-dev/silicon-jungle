/**
 * UrbanScatterManager.js — Infraestrutura Urbana com Relevo Perfeito, Carros Cyberpunk de Alta Fidelidade e 60 FPS
 * Calçadas contínuas 100% moldadas ao terreno, carros com portas/rodas/vidros/faróis, postes de iluminação e vegetação 3D otimizada.
 */
import { scene } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { createSparkBurst } from '../../utils/particles.js?v=20260821';
import { TreeFactory, mergeBufferGeometries } from '../vegetation/TreeFactory.js?v=20260821';
import { spatialExclusionService } from '../../core/SpatialExclusionService.js?v=20260821';
import { aabbFromYawFootprint } from '../../utils/losMath.js?v=20260821';
import { pickNearestStreetLightIndices, MAX_ACTIVE_STREET_LIGHTS } from '../../utils/streetLightPool.js?v=20260828';

export const flickeringLights = [];
const streetLightPool = [];

function ensureStreetLightPool() {
  if (streetLightPool.length) return;
  for (let i = 0; i < MAX_ACTIVE_STREET_LIGHTS; i++) {
    const lamp = new THREE.PointLight(0xfde047, 1.55, 18);
    lamp.castShadow = false;
    lamp.visible = false;
    scene.add(lamp);
    streetLightPool.push(lamp);
  }
}

export class UrbanScatterManager {
  static build() {
    this.buildTerrainConformingRoadsAndSidewalks();
    this.buildDetailedCyberpunkVehicles();
    this.buildOvergrownUrbanTrees();
    this.buildVolumetric3DPlants();
    this.buildStreetRubble();
    this.buildStreetlightsAndShopLamps();
    this.buildShopfrontNeon();
    this.buildConcreteBarriers();
    this.buildAlleyFencesAndDumpsters();
  }

  /**
   * 1. Avenidas de Asfalto Escuro e Calçadas em Malhas Contínuas 100% Moldadas ao Relevo
   */
  static buildTerrainConformingRoadsAndSidewalks() {
    const roadMat = TOON_MATERIALS.DARK_ASPHALT_ROAD;
    const sidewalkMat = TOON_MATERIALS.SIDEWALK_PAVEMENT;

    // Registro das Avenidas no SpatialExclusionService
    spatialExclusionService.registerRoad('road_ns', -5.0, 5.0, -140, 140);
    spatialExclusionService.registerRoad('road_ew', -140, 140, -5.0, 5.0);

    // Registro das 4 Calçadas
    spatialExclusionService.registerSidewalk('sidewalk_w', -9.0, -5.0, -140, 140);
    spatialExclusionService.registerSidewalk('sidewalk_e', 5.0, 9.0, -140, 140);
    spatialExclusionService.registerSidewalk('sidewalk_n', -140, 140, -9.0, -5.0);
    spatialExclusionService.registerSidewalk('sidewalk_s', -140, 140, 5.0, 9.0);

    // A. Pista Asfáltica Norte-Sul (Largura 10m, Z: -140 a 140)
    const segCountZ = 64;
    const roadZGeo = new THREE.PlaneGeometry(10.0, 280, 4, segCountZ);
    roadZGeo.rotateX(-Math.PI / 2);

    const posZ = roadZGeo.attributes.position;
    for (let i = 0; i < posZ.count; i++) {
      const vx = posZ.getX(i);
      const vz = posZ.getZ(i);
      posZ.setY(i, worldService.getHeight(vx, vz) + 0.08);
    }
    roadZGeo.computeVertexNormals();
    const roadZMesh = new THREE.Mesh(roadZGeo, roadMat);
    roadZMesh.receiveShadow = true;
    scene.add(roadZMesh);

    // B. Pista Asfáltica Leste-Oeste (Largura 10m, X: -140 a 140)
    const segCountX = 64;
    const roadXGeo = new THREE.PlaneGeometry(280, 10.0, segCountX, 4);
    roadXGeo.rotateX(-Math.PI / 2);

    const posX = roadXGeo.attributes.position;
    for (let i = 0; i < posX.count; i++) {
      const vx = posX.getX(i);
      const vz = posX.getZ(i);
      posX.setY(i, worldService.getHeight(vx, vz) + 0.08);
    }
    roadXGeo.computeVertexNormals();
    const roadXMesh = new THREE.Mesh(roadXGeo, roadMat);
    roadXMesh.receiveShadow = true;
    scene.add(roadXMesh);

    // C. Calçadas Contínuas e Meios-Fios Moldados ao Relevo (Terrain-Conforming Grids)
    // Calçadas Leste e Oeste (Paralelas à pista Z)
    [-1, 1].forEach(side => {
      const sxCenter = side * 7.0;
      const walkGeo = new THREE.PlaneGeometry(4.0, 280, 3, segCountZ);
      walkGeo.rotateX(-Math.PI / 2);

      const posW = walkGeo.attributes.position;
      for (let i = 0; i < posW.count; i++) {
        const vx = posW.getX(i) + sxCenter;
        const vz = posW.getZ(i);
        posW.setX(i, vx);
        posW.setY(i, worldService.getHeight(vx, vz) + 0.22);
      }
      walkGeo.computeVertexNormals();
      const walkMesh = new THREE.Mesh(walkGeo, sidewalkMat);
      walkMesh.castShadow = false; walkMesh.receiveShadow = true;
      scene.add(walkMesh);
    });

    // Calçadas Norte e Sul (Paralelas à pista X)
    [-1, 1].forEach(side => {
      const szCenter = side * 7.0;
      const walkGeo = new THREE.PlaneGeometry(280, 4.0, segCountX, 3);
      walkGeo.rotateX(-Math.PI / 2);

      const posW = walkGeo.attributes.position;
      for (let i = 0; i < posW.count; i++) {
        const vx = posW.getX(i);
        const vz = posW.getZ(i) + szCenter;
        posW.setZ(i, vz);
        posW.setY(i, worldService.getHeight(vx, vz) + 0.22);
      }
      walkGeo.computeVertexNormals();
      const walkMesh = new THREE.Mesh(walkGeo, sidewalkMat);
      walkMesh.castShadow = false; walkMesh.receiveShadow = true;
      scene.add(walkMesh);
    });

    this.#addLaneMarkingsAndCurbs(segCountZ, segCountX);
  }

  static #conformPlaneY(geo, yOff) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, worldService.getHeight(pos.getX(i), pos.getZ(i)) + yOff);
    }
    geo.computeVertexNormals();
  }

  static #addLaneMarkingsAndCurbs(segCountZ, segCountX) {
    const laneMat = new THREE.MeshToonMaterial({
      color: 0xc9b458,
      gradientMap: TOON_MATERIALS.DARK_ASPHALT_ROAD.gradientMap
    });

    const addLane = (w, d, segsW, segsD, tx, tz) => {
      const geo = new THREE.PlaneGeometry(w, d, segsW, segsD);
      geo.rotateX(-Math.PI / 2);
      geo.translate(tx, 0, tz);
      this.#conformPlaneY(geo, 0.12);
      const mesh = new THREE.Mesh(geo, laneMat);
      mesh.receiveShadow = true;
      scene.add(mesh);
    };

    // Faixas NS/LO a +0.04 do asfalto (Y = terreno + 0.12); sem cruzamento central
    addLane(0.18, 128, 1, 32, 0, 76);
    addLane(0.18, 128, 1, 32, 0, -76);
    addLane(128, 0.18, 32, 1, 76, 0);
    addLane(128, 0.18, 32, 1, -76, 0);

    const curbGeos = [];
    for (let z = -136; z <= 136; z += 8) {
      if (Math.abs(z) < 11) continue;
      for (const x of [-5.05, 5.05, -8.95, 8.95]) {
        const box = new THREE.BoxGeometry(0.22, 0.28, 7.6);
        box.translate(x, worldService.getHeight(x, z) + 0.14, z);
        curbGeos.push(box);
      }
    }
    for (let x = -136; x <= 136; x += 8) {
      if (Math.abs(x) < 11) continue;
      for (const z of [-5.05, 5.05, -8.95, 8.95]) {
        const box = new THREE.BoxGeometry(7.6, 0.28, 0.22);
        box.translate(x, worldService.getHeight(x, z) + 0.14, z);
        curbGeos.push(box);
      }
    }
    const curbMesh = new THREE.Mesh(mergeBufferGeometries(curbGeos), TOON_MATERIALS.CONCRETE_BUNKER);
    curbMesh.castShadow = false;
    curbMesh.receiveShadow = true;
    scene.add(curbMesh);
  }

  /**
   * 2. Carros Cyberpunk de Alta Fidelidade com Rodas 3D, Portas, Vidros, Faróis e 4 Variações
   */
  static buildDetailedCyberpunkVehicles() {
    const carSpots = [
      { x: -3.5, z: 14, rotY: 0.25, type: 'coupe', color: 'cyan' },
      { x: 4.2, z: 28, rotY: -0.6, type: 'pickup', color: 'amber' },
      { x: -3.8, z: 46, rotY: 2.1, type: 'van', color: 'terracotta' },
      { x: 3.6, z: 62, rotY: -0.3, type: 'interceptor', color: 'blue' },
      { x: -4.0, z: 85, rotY: 1.4, type: 'pickup', color: 'amber' },
      { x: 3.5, z: 110, rotY: -0.8, type: 'coupe', color: 'cyan' },
      { x: -3.6, z: -15, rotY: 0.4, type: 'van', color: 'terracotta' },
      { x: 4.0, z: -35, rotY: -1.2, type: 'pickup', color: 'amber' },
      { x: -3.5, z: -65, rotY: 2.8, type: 'coupe', color: 'cyan' },
      { x: 3.8, z: -95, rotY: -0.15, type: 'interceptor', color: 'blue' },
      { x: 18, z: 3.8, rotY: 1.6, type: 'coupe', color: 'cyan' },
      { x: 42, z: -3.6, rotY: 1.8, type: 'pickup', color: 'amber' },
      { x: 75, z: 3.5, rotY: -1.4, type: 'van', color: 'terracotta' },
      { x: -22, z: -3.5, rotY: 1.2, type: 'coupe', color: 'cyan' },
      { x: -55, z: 4.0, rotY: -1.7, type: 'pickup', color: 'amber' },
      { x: -85, z: -3.8, rotY: 0.9, type: 'interceptor', color: 'blue' }
    ];

    const metalCyan = TOON_MATERIALS.CYAN_PANEL_METAL;
    const metalAmber = TOON_MATERIALS.AMBER_PANEL_METAL;
    const metalTerracotta = TOON_MATERIALS.TERRACOTTA_CONCRETE;
    const metalDark = TOON_MATERIALS.OBSIDIAN_CONCRETE;
    const glassMat = TOON_MATERIALS.SHATTERED_GLASS;
    const tireMat = TOON_MATERIALS.DARK_ASPHALT_ROAD;
    const rimMat = TOON_MATERIALS.METAL_BRUSHED_STEEL;
    const headLightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const bodyCyanGeos = [];
    const bodyAmberGeos = [];
    const bodyTerraGeos = [];
    const bodyDarkGeos = [];
    const wheelGeos = [];
    const glassGeos = [];
    const headLightGeos = [];
    const tailLightGeos = [];

    carSpots.forEach((spot) => {
      const y = worldService.getHeight(spot.x, spot.z);
      const isPickup = spot.type === 'pickup';
      const isVan = spot.type === 'van';
      const isCoupe = spot.type === 'coupe';

      const w = isVan ? 2.4 : (isPickup ? 2.3 : 2.1);
      const l = isVan ? 5.6 : (isPickup ? 5.2 : 4.5);
      const h = isVan ? 2.2 : (isPickup ? 1.8 : 1.35);

      const carGroupGeos = [];

      // 1. Chassi e Lataria Principal
      const chassis = new THREE.BoxGeometry(w, h * 0.55, l);
      chassis.translate(0, (h * 0.55) / 2 + 0.38, 0);
      carGroupGeos.push(chassis);

      // 2. Cabine com Portas e Teto
      const cabinL = isVan ? l * 0.75 : (isPickup ? l * 0.45 : l * 0.55);
      const cabinH = isVan ? h * 0.5 : (isPickup ? h * 0.52 : h * 0.48);
      const cabinZ = isVan ? 0.2 : (isPickup ? -l * 0.15 : -l * 0.05);

      const cabin = new THREE.BoxGeometry(w * 0.9, cabinH, cabinL);
      cabin.translate(0, h * 0.55 + cabinH / 2 + 0.38, cabinZ);
      carGroupGeos.push(cabin);

      // Para-choques reforçados
      const fNumper = new THREE.BoxGeometry(w + 0.1, 0.35, 0.4);
      fNumper.translate(0, 0.48, l / 2 + 0.1);
      const rBumper = new THREE.BoxGeometry(w + 0.1, 0.35, 0.4);
      rBumper.translate(0, 0.48, -l / 2 - 0.1);
      carGroupGeos.push(fNumper, rBumper);

      const mergedBody = mergeBufferGeometries(carGroupGeos);
      mergedBody.rotateY(spot.rotY);
      mergedBody.translate(spot.x, y, spot.z);

      if (spot.color === 'cyan') bodyCyanGeos.push(mergedBody);
      else if (spot.color === 'amber') bodyAmberGeos.push(mergedBody);
      else if (spot.color === 'terracotta') bodyTerraGeos.push(mergedBody);
      else bodyDarkGeos.push(mergedBody);

      // 3. Vidro Quebrado do Para-brisa e Janelas
      const windshield = new THREE.BoxGeometry(w * 0.82, cabinH * 0.85, 0.12);
      windshield.rotateX(0.42);
      windshield.translate(0, h * 0.55 + cabinH * 0.5 + 0.38, cabinZ + cabinL / 2 + 0.1);
      windshield.rotateY(spot.rotY);
      windshield.translate(spot.x, y, spot.z);
      glassGeos.push(windshield);

      // 4. 4 Rodas 3D de Borracha com Aros
      const wheelOffsets = [
        { wx: -w / 2 - 0.06, wz: l * 0.32 },
        { wx: w / 2 + 0.06, wz: l * 0.32 },
        { wx: -w / 2 - 0.06, wz: -l * 0.32 },
        { wx: w / 2 + 0.06, wz: -l * 0.32 }
      ];

      wheelOffsets.forEach(wo => {
        const wheel = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
        wheel.rotateZ(Math.PI / 2);
        wheel.translate(wo.wx, 0.42, wo.wz);
        wheel.rotateY(spot.rotY);
        wheel.translate(spot.x, y, spot.z);
        wheelGeos.push(wheel);
      });

      // 5. Faróis Dianteiros e Lanternas Traseiras Autoiluminadas
      const fLightL = new THREE.BoxGeometry(0.35, 0.18, 0.15);
      fLightL.translate(-w * 0.35, 0.65, l / 2 + 0.22);
      const fLightR = new THREE.BoxGeometry(0.35, 0.18, 0.15);
      fLightR.translate(w * 0.35, 0.65, l / 2 + 0.22);
      fLightL.rotateY(spot.rotY); fLightL.translate(spot.x, y, spot.z);
      fLightR.rotateY(spot.rotY); fLightR.translate(spot.x, y, spot.z);
      headLightGeos.push(fLightL, fLightR);

      const rLightL = new THREE.BoxGeometry(0.32, 0.16, 0.15);
      rLightL.translate(-w * 0.35, 0.65, -l / 2 - 0.22);
      const rLightR = new THREE.BoxGeometry(0.32, 0.16, 0.15);
      rLightR.translate(w * 0.35, 0.65, -l / 2 - 0.22);
      rLightL.rotateY(spot.rotY); rLightL.translate(spot.x, y, spot.z);
      rLightR.rotateY(spot.rotY); rLightR.translate(spot.x, y, spot.z);
      tailLightGeos.push(rLightL, rLightR);

      const carAabb = aabbFromYawFootprint({
        x: spot.x,
        z: spot.z,
        y,
        halfW: w / 2,
        halfL: l / 2,
        height: h + 0.5,
        yaw: spot.rotY,
        pad: 0.2
      });
      worldService.addCollider({
        type: 'box',
        box: new THREE.Box3(
          new THREE.Vector3(carAabb.min.x, carAabb.min.y, carAabb.min.z),
          new THREE.Vector3(carAabb.max.x, carAabb.max.y, carAabb.max.z)
        )
      });

      spatialExclusionService.registerProp(`car_${spot.x}_${spot.z}`, spot.x, spot.z, Math.max(w, l) / 2, 'PROP', 1.2);
    });

    if (bodyCyanGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(bodyCyanGeos), metalCyan);
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    if (bodyAmberGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(bodyAmberGeos), metalAmber);
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    if (bodyTerraGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(bodyTerraGeos), metalTerracotta);
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    if (bodyDarkGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(bodyDarkGeos), metalDark);
      mesh.castShadow = true; mesh.receiveShadow = true; scene.add(mesh);
    }
    if (wheelGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(wheelGeos), tireMat);
      mesh.castShadow = false; mesh.receiveShadow = true; scene.add(mesh);
    }
    if (glassGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(glassGeos), glassMat);
      scene.add(mesh);
    }
    if (headLightGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(headLightGeos), headLightMat);
      scene.add(mesh);
    }
    if (tailLightGeos.length) {
      const mesh = new THREE.Mesh(mergeBufferGeometries(tailLightGeos), tailLightMat);
      scene.add(mesh);
    }
  }

  /**
   * 3. Árvores Tropicais Reais Brotando no Asfalto — InstancedMesh (10 → 6 draw calls)
   */
  static buildOvergrownUrbanTrees() {
    const treeSpots = [
      { x: -12.5, z: 32, type: 'cacao', scale: 1.1 },
      { x: 12.8, z: 68, type: 'banyan', scale: 0.85 },
      { x: -12.2, z: 105, type: 'embauba', scale: 0.95 },
      { x: 12.4, z: -30, type: 'cacao', scale: 1.2 },
      { x: -12.6, z: -72, type: 'banyan', scale: 0.8 },
      { x: 12.5, z: -110, type: 'embauba', scale: 1.0 },
      { x: 35, z: 12.4, type: 'cacao', scale: 1.0 },
      { x: 80, z: -12.5, type: 'banyan', scale: 0.9 },
      { x: -7.2, z: 48, type: 'embauba', scale: 1.1 },
      { x: 7.2, z: -52, type: 'cacao', scale: 1.15 }
    ];

    const byType = { banyan: [], embauba: [], cacao: [] };
    treeSpots.forEach((spot) => byType[spot.type].push(spot));

    const templates = {
      banyan: TreeFactory.createBanyanTree(14, 1.1),
      embauba: TreeFactory.createEmbaubaTree(12, 0.5),
      cacao: TreeFactory.createCacaueiroTree(7.5, 0.45)
    };

    const dummy = new THREE.Object3D();

    Object.entries(byType).forEach(([type, spots]) => {
      if (!spots.length) return;
      const tpl = templates[type];
      if (!tpl) return;

      const trunkMesh = new THREE.InstancedMesh(
        tpl.trunkGeometry,
        TOON_MATERIALS.REALISTIC_ISLAND_TRUNK,
        spots.length
      );
      trunkMesh.castShadow = true;
      trunkMesh.receiveShadow = true;

      const canopyMesh = new THREE.InstancedMesh(
        tpl.canopyGeometry,
        TOON_MATERIALS.REALISTIC_ISLAND_LEAVES,
        spots.length
      );
      canopyMesh.castShadow = true;

      spots.forEach((spot, idx) => {
        const y = worldService.getHeight(spot.x, spot.z);
        dummy.position.set(spot.x, y, spot.z);
        dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        dummy.scale.setScalar(spot.scale);
        dummy.updateMatrix();
        trunkMesh.setMatrixAt(idx, dummy.matrix);
        canopyMesh.setMatrixAt(idx, dummy.matrix);

        worldService.addCollider({
          type: 'cylinder',
          center: { x: spot.x, z: spot.z },
          radius: 0.7 * spot.scale
        });
      });

      trunkMesh.instanceMatrix.needsUpdate = true;
      canopyMesh.instanceMatrix.needsUpdate = true;
      scene.add(trunkMesh);
      scene.add(canopyMesh);
    });
  }

  /**
   * 4. Vegetação 3D Volumétrica Caótica e Agrupamentos Orgânicos Otimizados
   */
  static buildVolumetric3DPlants() {
    const stemGeos = [];
    const leafGeos = [];

    const plantClusterCenters = [
      { x: -8.8, z: 16, count: 4 }, { x: 8.8, z: 24, count: 4 },
      { x: -8.9, z: 42, count: 5 }, { x: 8.7, z: 60, count: 5 },
      { x: -8.8, z: 82, count: 4 }, { x: 8.8, z: 100, count: 5 },
      { x: -8.7, z: -14, count: 4 }, { x: 8.9, z: -36, count: 5 },
      { x: -8.8, z: -64, count: 4 }, { x: 8.7, z: -88, count: 5 },
      { x: 18, z: -8.8, count: 4 }, { x: 44, z: 8.8, count: 5 },
      { x: 70, z: -8.8, count: 4 }, { x: -24, z: 8.8, count: 5 },
      { x: -52, z: -8.7, count: 5 }, { x: -78, z: 8.8, count: 4 }
    ];

    plantClusterCenters.forEach(cluster => {
      for (let i = 0; i < cluster.count; i++) {
        const px = cluster.x + (Math.random() - 0.5) * 3.0;
        const pz = cluster.z + (Math.random() - 0.5) * 3.0;
        const py = worldService.getHeight(px, pz);
        const pScale = 0.6 + Math.random() * 0.7;

        const stem = new THREE.CylinderGeometry(0.04 * pScale, 0.08 * pScale, 0.6 * pScale, 5);
        stem.translate(px, py + 0.3 * pScale, pz);
        stemGeos.push(stem);

        for (let f = 0; f < 4; f++) {
          const fAngle = (f / 4) * Math.PI * 2 + Math.random() * 0.4;
          const leafLen = (0.9 + Math.random() * 0.4) * pScale;
          const leafW = (0.28 + Math.random() * 0.12) * pScale;

          const leaf = new THREE.BoxGeometry(leafW, 0.04 * pScale, leafLen);
          leaf.rotateX(-0.55 - Math.random() * 0.3);
          leaf.rotateY(fAngle);
          leaf.translate(
            px + Math.sin(fAngle) * (leafLen * 0.45),
            py + 0.35 * pScale,
            pz + Math.cos(fAngle) * (leafLen * 0.45)
          );
          leafGeos.push(leaf);
        }
      }
    });

    if (stemGeos.length) {
      const mergedStems = mergeBufferGeometries(stemGeos);
      const stemMesh = new THREE.Mesh(mergedStems, TOON_MATERIALS.REALISTIC_ISLAND_TRUNK);
      scene.add(stemMesh);
    }
    if (leafGeos.length) {
      const mergedLeaves = mergeBufferGeometries(leafGeos);
      const leafMesh = new THREE.Mesh(mergedLeaves, TOON_MATERIALS.REALISTIC_FERN);
      leafMesh.castShadow = true;
      scene.add(leafMesh);
    }
  }

  /**
   * 5. Destroços de Concreto e Vigas de Ferro Caídas
   */
  static buildStreetRubble() {
    const rubbleGeos = [];
    const ironGeos = [];

    const debrisSpots = [
      { x: -2.5, z: 18, type: 'slab' },
      { x: 3.2, z: 38, type: 'beam' },
      { x: -1.8, z: 54, type: 'pile' },
      { x: 2.8, z: 72, type: 'slab' },
      { x: -3.0, z: 92, type: 'beam' },
      { x: 2.2, z: 115, type: 'pile' },
      { x: -2.8, z: -18, type: 'slab' },
      { x: 3.0, z: -42, type: 'beam' },
      { x: -2.2, z: -68, type: 'pile' },
      { x: 2.5, z: -90, type: 'slab' },
      { x: 22, z: -2.8, type: 'pile' },
      { x: 48, z: 2.5, type: 'beam' },
      { x: 78, z: -2.2, type: 'slab' },
      { x: -28, z: 2.8, type: 'slab' },
      { x: -58, z: -2.5, type: 'beam' },
      { x: -88, z: 2.2, type: 'pile' }
    ];

    debrisSpots.forEach(spot => {
      const y = worldService.getHeight(spot.x, spot.z);

      if (spot.type === 'slab') {
        const slab = new THREE.BoxGeometry(2.4, 0.4, 1.8);
        slab.rotateX((Math.random() - 0.5) * 0.3);
        slab.rotateY(Math.random() * Math.PI);
        slab.translate(spot.x, y + 0.2, spot.z);
        rubbleGeos.push(slab);
      } else if (spot.type === 'beam') {
        const beam = new THREE.BoxGeometry(0.3, 0.3, 4.8);
        beam.rotateZ(0.2);
        beam.rotateY(Math.random() * Math.PI);
        beam.translate(spot.x, y + 0.18, spot.z);
        ironGeos.push(beam);
      } else if (spot.type === 'pile') {
        for (let i = 0; i < 3; i++) {
          const chunk = new THREE.BoxGeometry(0.7, 0.45, 0.7);
          chunk.rotateY(Math.random() * Math.PI);
          chunk.translate(spot.x + (i - 1) * 0.45, y + 0.22, spot.z + (Math.random() - 0.5) * 0.4);
          rubbleGeos.push(chunk);
        }
      }
    });

    const mergedRubble = mergeBufferGeometries(rubbleGeos);
    const rubbleMesh = new THREE.Mesh(mergedRubble, TOON_MATERIALS.CONCRETE_BUNKER);
    rubbleMesh.castShadow = true; rubbleMesh.receiveShadow = true;
    scene.add(rubbleMesh);

    const mergedIron = mergeBufferGeometries(ironGeos);
    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = true;
    scene.add(ironMesh);
  }

  /**
   * 6. Postes de Iluminação Urbana e Lâmpadas
   */
  static buildStreetlightsAndShopLamps() {
    const poleMat = TOON_MATERIALS.METAL_PLATES_IO;
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 1.0 });

    const poleSpots = [
      { x: -5.8, z: 8, working: true }, { x: 5.8, z: 22, working: true },
      { x: -5.8, z: 38, working: true }, { x: 5.8, z: 58, working: true },
      { x: -5.8, z: 78, working: true }, { x: 5.8, z: 98, working: false },
      { x: -5.8, z: -10, working: true }, { x: 5.8, z: -28, working: true },
      { x: -5.8, z: -48, working: false }, { x: 5.8, z: -68, working: true },
      { x: 12, z: 5.8, working: true }, { x: 32, z: -5.8, working: true },
      { x: 52, z: 5.8, working: true }, { x: -18, z: 5.8, working: true },
      { x: -38, z: -5.8, working: false }, { x: -58, z: 5.8, working: false }
    ];

    const poleGeos = [];

    poleSpots.forEach((spot) => {
      const y = worldService.getHeight(spot.x, spot.z);

      if (!spot.working && Math.random() < 0.3) {
        const fallenPole = new THREE.CylinderGeometry(0.18, 0.22, 8.5, 8);
        fallenPole.rotateZ(Math.PI / 2.2);
        fallenPole.rotateY(Math.random() * Math.PI);
        fallenPole.translate(spot.x, y + 0.35, spot.z);
        poleGeos.push(fallenPole);
      } else {
        const pole = new THREE.CylinderGeometry(0.16, 0.22, 8.5, 8);
        pole.translate(0, 4.25, 0);

        const arm = new THREE.BoxGeometry(2.5, 0.2, 0.2);
        arm.translate(spot.x > 0 ? -1.1 : 1.1, 8.2, 0);

        const lampHead = new THREE.BoxGeometry(0.9, 0.35, 0.6);
        lampHead.translate(spot.x > 0 ? -2.2 : 2.2, 8.0, 0);

        const singlePole = mergeBufferGeometries([pole, arm, lampHead]);
        singlePole.translate(spot.x, y, spot.z);
        poleGeos.push(singlePole);

        if (spot.working) {
          const lx = spot.x + (spot.x > 0 ? -2.2 : 2.2);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), bulbMat);
          bulb.position.set(lx, y + 7.8, spot.z);
          scene.add(bulb);

          const flickerCount = flickeringLights.filter(f => f.flicker).length;
          flickeringLights.push({
            bulb,
            baseIntensity: 1.55,
            intensity: 1.55,
            timer: Math.random() * 4.0,
            pos: new THREE.Vector3(lx, y + 7.8, spot.z),
            lightY: y + 7.5,
            flicker: flickerCount < 3
          });
        }
      }

      worldService.addCollider({
        type: 'cylinder',
        center: { x: spot.x, z: spot.z },
        radius: 0.6
      });

      spatialExclusionService.registerProp(`pole_${spot.x}_${spot.z}`, spot.x, spot.z, 0.4, 'PROP', 1.0);
    });

    const mergedPoles = mergeBufferGeometries(poleGeos);
    const polesMesh = new THREE.Mesh(mergedPoles, poleMat);
    polesMesh.castShadow = true;
    scene.add(polesMesh);

    ensureStreetLightPool();
    this.updateStreetLightPool(null);
  }

  /**
   * 7. Barreiras de Concreto
   */
  static buildConcreteBarriers() {
    const barrierMat = TOON_MATERIALS.CONCRETE_BUNKER;
    const barrierGeo = new THREE.BoxGeometry(3.5, 1.1, 0.8);

    const barrierSpots = [
      { x: -6.8, z: 15, rot: 0.1 }, { x: 6.8, z: 25, rot: -0.15 },
      { x: -6.8, z: 40, rot: -0.2 }, { x: 6.8, z: 55, rot: 0.1 },
      { x: -6.8, z: -20, rot: 0.2 }, { x: 6.8, z: -20, rot: -0.2 }
    ];

    const barrierMesh = new THREE.InstancedMesh(barrierGeo, barrierMat, barrierSpots.length);
    const dummy = new THREE.Object3D();

    barrierSpots.forEach((b, idx) => {
      const y = worldService.getHeight(b.x, b.z);
      dummy.position.set(b.x, y + 0.55, b.z);
      dummy.rotation.y = b.rot;
      dummy.updateMatrix();
      barrierMesh.setMatrixAt(idx, dummy.matrix);

      worldService.addCollider({
        type: 'box',
        box: new THREE.Box3().setFromCenterAndSize(
          new THREE.Vector3(b.x, y + 0.55, b.z),
          new THREE.Vector3(3.6, 1.2, 1.0)
        )
      });
    });

    barrierMesh.castShadow = true; barrierMesh.receiveShadow = true;
    scene.add(barrierMesh);
  }

  /**
   * 8. Becos com Grades e Caçambas
   */
  static buildAlleyFencesAndDumpsters() {
    const fenceGeos = [];
    const ironGeos = [];

    const alleySpots = [
      { x: -18, z: 37.5, w: 8.0, h: 3.5, rot: 0 },
      { x: 18, z: 37.5, w: 8.0, h: 3.5, rot: 0 },
      { x: -18, z: 62.5, w: 8.0, h: 3.5, rot: 0 },
      { x: 18, z: 62.5, w: 8.0, h: 3.5, rot: 0 },
      { x: 37.5, z: 18, w: 8.0, h: 3.5, rot: Math.PI / 2 },
      { x: -37.5, z: 18, w: 8.0, h: 3.5, rot: Math.PI / 2 }
    ];

    alleySpots.forEach(alley => {
      const y = worldService.getHeight(alley.x, alley.z);

      [-alley.w / 2, alley.w / 2].forEach(px => {
        const post = new THREE.CylinderGeometry(0.08, 0.08, alley.h + 0.6, 6);
        post.translate(px, (alley.h + 0.6) / 2, 0);
        if (alley.rot) post.rotateY(alley.rot);
        post.translate(alley.x, y, alley.z);
        ironGeos.push(post);
      });

      const fencePlane = new THREE.PlaneGeometry(alley.w, alley.h, 4, 3);
      fencePlane.translate(0, alley.h / 2, 0);
      if (alley.rot) fencePlane.rotateY(alley.rot);
      fencePlane.translate(alley.x, y, alley.z);
      fenceGeos.push(fencePlane);

      const dumpster = new THREE.BoxGeometry(2.4, 1.4, 1.6);
      dumpster.translate(0, 0.7, 1.8);
      if (alley.rot) dumpster.rotateY(alley.rot);
      dumpster.translate(alley.x, y, alley.z);
      ironGeos.push(dumpster);
    });

    const mergedFence = mergeBufferGeometries(fenceGeos);
    const fenceMesh = new THREE.Mesh(mergedFence, TOON_MATERIALS.FENCE_CHAINLINK);
    scene.add(fenceMesh);

    const mergedIron = mergeBufferGeometries(ironGeos);
    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = true; ironMesh.receiveShadow = true;
    scene.add(ironMesh);
  }

  static buildShopfrontNeon() {
    const strips = [
      { x: 14, z: 11.5, w: 3.2, color: 0x00f0ff },
      { x: -16, z: 11.5, w: 2.8, color: 0xffb700 },
      { x: 14, z: -11.5, w: 3.0, color: 0xff007f },
      { x: -16, z: -11.5, w: 2.6, color: 0x00ffaa },
      { x: 11.5, z: 36, w: 2.4, color: 0x00f0ff },
      { x: -11.5, z: -40, w: 2.4, color: 0xffb700 }
    ];
    strips.forEach((s) => {
      const y = worldService.getHeight(s.x, s.z) + 3.4;
      const geo = new THREE.BoxGeometry(s.w, 0.18, 0.08);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: s.color }));
      mesh.position.set(s.x, y, s.z);
      scene.add(mesh);
    });
  }

  static updateStreetLightPool(cameraPos) {
    ensureStreetLightPool();
    const lights = flickeringLights;
    const n = lights.length;
    for (let i = 0; i < streetLightPool.length; i++) streetLightPool[i].visible = false;
    if (!n) return [];
    const on = pickNearestStreetLightIndices(lights, cameraPos, MAX_ACTIVE_STREET_LIGHTS);
    for (let i = 0; i < on.length; i++) {
      const fl = lights[on[i]];
      const light = streetLightPool[i];
      light.position.set(fl.pos.x, fl.lightY != null ? fl.lightY : fl.pos.y, fl.pos.z);
      light.intensity = fl.intensity != null ? fl.intensity : fl.baseIntensity;
      light.visible = true;
    }
    return on;
  }

  static update(delta, time, cameraPos) {
    const on = this.updateStreetLightPool(cameraPos);
    const active = Object.create(null);
    for (let i = 0; i < on.length; i++) active[on[i]] = true;
    let flickered = false;
    for (let i = 0; i < flickeringLights.length; i++) {
      const fl = flickeringLights[i];
      if (!fl.flicker || !active[i]) continue;
      fl.timer -= delta;

      if (fl.timer <= 0) {
        flickered = true;
        const isOff = Math.random() < 0.35;
        fl.intensity = isOff ? 0.05 : (fl.baseIntensity * (0.6 + Math.random() * 0.8));
        fl.bulb.material.opacity = isOff ? 0.2 : 1.0;

        if (Math.random() < 0.1) {
          createSparkBurst(fl.pos, 0xfde047, 5);
        }

        fl.timer = isOff ? (0.05 + Math.random() * 0.2) : (0.4 + Math.random() * 3.5);
      }
    }
    if (flickered) this.updateStreetLightPool(cameraPos);
  }
}
