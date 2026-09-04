/**
 * CityLayoutManager.js — Plano Diretor Urbanístico em Grid Regulamentado & Validador de Não-Sobreposição
 * Distribui 40+ edifícios de alta fidelidade em 4 quadrantes com espaçamento mínimo de 8m-14m entre estruturas,
 * corredores de entrada 100% desobstruídos e registro unificado no SpatialExclusionService.
 */
import { scene } from '../../core/scene.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { RenderOptimizer } from '../../core/RenderOptimizer.js?v=20260912';
import { spatialExclusionService } from '../../core/SpatialExclusionService.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { mergeBufferGeometries } from '../vegetation/TreeFactory.js?v=20260821';
import { BuildingFactory } from './BuildingFactory.js?v=20260821';
import { foundationColliders, doorwayVolume, worldAabbFromLocal } from './buildings/buildingColliders.js?v=20260821';
import { tileKey, tileBounds } from '../cityTiles.js?v=20260912';

// =========================================================================
// Specs dos Lotes Urbanos (exportado para o sistema de loot da Fase 4 — Economia)
// =========================================================================
export const allBuildingSpecs = [
  // =========================================================================
  // QUADRANTE 1: NORDESTE (X > 0, Z > 0)
  // =========================================================================
  // A. Fachada Oeste (Avenida Z Norte-Sul, frente voltada para o Oeste rot = -Math.PI/2)
  { id: 'b_ne_z1', x: 22, z: 32, type: 'hardware_store', rot: -Math.PI / 2, w: 16, d: 16, h: 14 },
  { id: 'b_ne_z2', x: 24, z: 58, type: 'grand_tower', rot: -Math.PI / 2, w: 20, d: 20, h: 42 },
  { id: 'b_ne_z3', x: 22, z: 86, type: 'dip', rot: -Math.PI / 2, w: 18, d: 22, h: 26 },
  { id: 'b_ne_z4', x: 24, z: 116, type: 'heatsink', rot: -Math.PI / 2, w: 20, d: 20, h: 38 },

  // B. Fachada Sul (Avenida X Leste-Oeste, frente voltada para o Sul rot = Math.PI)
  { id: 'b_ne_x1', x: 50, z: 22, type: 'tech_workshop', rot: Math.PI, s: 16, h: 10 },
  { id: 'b_ne_x2', x: 78, z: 24, type: 'mall', rot: Math.PI, w: 20, d: 22, h: 16 },
  { id: 'b_ne_x3', x: 108, z: 22, type: 'transformer', rot: Math.PI, s: 14, h: 14 },

  // C. Quarteirões Internos
  { id: 'b_ne_in1', x: 56, z: 56, type: 'overgrown', rot: 0, w: 20, d: 20, h: 22 },
  { id: 'b_ne_in2', x: 86, z: 86, type: 'silo', rot: 0, r: 8.5, h: 24 },
  { id: 'b_ne_in3', x: 116, z: 116, type: 'modular', rot: 0, w: 22, d: 16, h: 20 },

  // =========================================================================
  // QUADRANTE 2: NOROESTE (X < 0, Z > 0)
  // =========================================================================
  // A. Fachada Leste (Avenida Z Norte-Sul, frente voltada para o Leste rot = Math.PI/2)
  { id: 'b_nw_z1', x: -22, z: 32, type: 'mall', rot: Math.PI / 2, w: 20, d: 20, h: 16 },
  { id: 'b_nw_z2', x: -24, z: 58, type: 'tech_workshop', rot: Math.PI / 2, s: 16, h: 10 },
  { id: 'b_nw_z3', x: -22, z: 86, type: 'grand_tower', rot: Math.PI / 2, w: 20, d: 20, h: 42 },
  { id: 'b_nw_z4', x: -24, z: 116, type: 'hardware_store', rot: Math.PI / 2, w: 16, d: 16, h: 14 },

  // B. Fachada Sul (Avenida X Leste-Oeste, frente voltada para o Sul rot = Math.PI)
  { id: 'b_nw_x1', x: -50, z: 22, type: 'hardware_store', rot: Math.PI, w: 16, d: 16, h: 14 },
  { id: 'b_nw_x2', x: -78, z: 24, type: 'grand_tower', rot: Math.PI, w: 20, d: 20, h: 42 },
  { id: 'b_nw_x3', x: -108, z: 22, type: 'dip', rot: Math.PI, w: 18, d: 22, h: 26 },

  // C. Quarteirões Internos
  { id: 'b_nw_in1', x: -56, z: 56, type: 'heatsink', rot: 0, w: 20, d: 20, h: 38 },
  { id: 'b_nw_in2', x: -86, z: 86, type: 'transformer', rot: 0, s: 14, h: 14 },
  { id: 'b_nw_in3', x: -116, z: 116, type: 'overgrown', rot: 0, w: 20, d: 20, h: 22 },

  // =========================================================================
  // QUADRANTE 3: SUDOESTE (X < 0, Z < 0)
  // =========================================================================
  // A. Fachada Leste (Avenida Z Norte-Sul, frente voltada para o Leste rot = Math.PI/2)
  { id: 'b_sw_z1', x: -22, z: -32, type: 'grand_tower', rot: Math.PI / 2, w: 20, d: 20, h: 42 },
  { id: 'b_sw_z2', x: -24, z: -58, type: 'heatsink', rot: Math.PI / 2, w: 20, d: 20, h: 38 },
  { id: 'b_sw_z3', x: -22, z: -86, type: 'modular', rot: Math.PI / 2, w: 20, d: 16, h: 20 },
  { id: 'b_sw_z4', x: -24, z: -116, type: 'transformer', rot: Math.PI / 2, s: 14, h: 14 },

  // B. Fachada Norte (Avenida X Leste-Oeste, frente voltada para o Norte rot = 0)
  { id: 'b_sw_x1', x: -50, z: -22, type: 'mall', rot: 0, w: 20, d: 20, h: 16 },
  { id: 'b_sw_x2', x: -78, z: -24, type: 'tech_workshop', rot: 0, s: 16, h: 10 },
  { id: 'b_sw_x3', x: -108, z: -22, type: 'hardware_store', rot: 0, w: 16, d: 16, h: 14 },

  // C. Quarteirões Internos
  { id: 'b_sw_in1', x: -56, z: -56, type: 'silo', rot: 0, r: 8.5, h: 24 },
  { id: 'b_sw_in2', x: -86, z: -86, type: 'dip', rot: 0, w: 18, d: 22, h: 26 },
  { id: 'b_sw_in3', x: -116, z: -116, type: 'grand_tower', rot: 0, w: 20, d: 20, h: 42 },

  // =========================================================================
  // QUADRANTE 4: SUDESTE (X > 0, Z < 0)
  // =========================================================================
  // A. Fachada Oeste (Avenida Z Norte-Sul, frente voltada para o Oeste rot = -Math.PI/2)
  { id: 'b_se_z1', x: 22, z: -32, type: 'hardware_store', rot: -Math.PI / 2, w: 16, d: 16, h: 14 },
  { id: 'b_se_z2', x: 24, z: -58, type: 'tech_workshop', rot: -Math.PI / 2, s: 16, h: 10 },
  { id: 'b_se_z3', x: 22, z: -86, type: 'mall', rot: -Math.PI / 2, w: 20, d: 20, h: 16 },
  { id: 'b_se_z4', x: 24, z: -116, type: 'grand_tower', rot: -Math.PI / 2, w: 20, d: 20, h: 42 },

  // B. Fachada Norte (Avenida X Leste-Oeste, frente voltada para o Norte rot = 0)
  { id: 'b_se_x1', x: 50, z: -22, type: 'grand_tower', rot: 0, w: 20, d: 20, h: 42 },
  { id: 'b_se_x2', x: 78, z: -24, type: 'heatsink', rot: 0, w: 20, d: 20, h: 38 },
  { id: 'b_se_x3', x: 108, z: -22, type: 'overgrown', rot: 0, w: 18, d: 18, h: 22 },

  // C. Quarteirões Internos
  { id: 'b_se_in1', x: 56, z: -56, type: 'transformer', rot: 0, s: 14, h: 14 },
  { id: 'b_se_in2', x: 86, z: -86, type: 'silo', rot: 0, r: 8.5, h: 24 },
  { id: 'b_se_in3', x: 116, z: -116, type: 'modular', rot: 0, w: 20, d: 16, h: 20 }
];

export class CityLayoutManager {
  static build() {
    // 0. Registrar Praça Central do Jogador como SAFE_ZONE (raio de 22m desobstruído)
    spatialExclusionService.registerSafeZone('central_plaza', 0, 0, 22.0);

    // Validação Matemática de Não-Sobreposição entre todos os edifícios
    this.validateZeroOverlap(allBuildingSpecs);

    // Buckets por tile ~40 m (frustum/fog no RenderOptimizer). Merge por material dentro do tile.
    const tiles = new Map();
    const emptyBucket = () => ({ concrete: [], panel: [], iron: [], glass: [], vine: [] });

    allBuildingSpecs.forEach((spec) => {
      let bData = null;
      const bWidth = spec.w || (spec.r ? spec.r * 2 : (spec.s || 20));
      const bDepth = spec.d || (spec.r ? spec.r * 2 : (spec.s || 20));

      if (spec.type === 'hardware_store') {
        bData = BuildingFactory.createCyberHardwareStore(spec.w, spec.d, spec.h);
      } else if (spec.type === 'tech_workshop') {
        bData = BuildingFactory.createTechWorkshop(spec.s, spec.h);
      } else if (spec.type === 'grand_tower') {
        bData = BuildingFactory.createGrandTowerWithStairs(spec.w, spec.d, spec.h);
      } else if (spec.type === 'mall') {
        bData = BuildingFactory.createOvergrownMall(spec.w, spec.d, spec.h);
      } else if (spec.type === 'dip') {
        bData = BuildingFactory.createDIPChipTower(spec.w, spec.d, spec.h);
      } else if (spec.type === 'heatsink') {
        bData = BuildingFactory.createHeatsinkSkyscraper(spec.w, spec.d, spec.h);
      } else if (spec.type === 'silo') {
        bData = BuildingFactory.createCapacitorSilo(spec.r, spec.h);
      } else if (spec.type === 'modular') {
        bData = BuildingFactory.createModularSlotComplex(spec.w, spec.d, spec.h);
      } else if (spec.type === 'transformer') {
        bData = BuildingFactory.createTransformerBlock(spec.s, spec.h);
      } else if (spec.type === 'overgrown') {
        bData = BuildingFactory.createOvergrownRuin(spec.w, spec.d, spec.h);
      }

      if (bData) {
        const cosR = Math.cos(spec.rot || 0);
        const sinR = -Math.sin(spec.rot || 0); // alinha com THREE.rotateY (geometria visual)

        // Base alinhada ao terreno: cota mínima dos 4 cantos da footprint (x ± bWidth/2, z ± bDepth/2, rotacionados por spec.rot)
        // Em terreno irregular (fbm), o centro pode ser mais alto que as bordas — usar Math.min garante
        // que a fundação (7.5m enterrada, topo em yBase) não flutue nem deixe bordas expostas.
        const halfW = bWidth / 2;
        const halfD = bDepth / 2;
        const spanZ = Math.min(bDepth * 0.75, 12.0);
        const yBasePoints = [
          // 4 cantos da footprint
          [halfW, halfD], [halfW, -halfD], [-halfW, halfD], [-halfW, -halfD],
          // área do batente da porta (floorColliders vão até depth/2+3.2; grand_tower até depth/2+4.5)
          [0, halfD + 4.5], [0, halfD], [-4.6, halfD + 3.2], [4.6, halfD + 3.2],
          // base da escada de incêndio (patamar U: stairX=width/2+1.4, overshoot 4m, landingW 4m)
          [halfW + 1.4, spanZ / 2], [halfW + 1.4, -spanZ / 2],
          [halfW + 6.6, spanZ / 2 + 4], [halfW + 6.6, -spanZ / 2 - 4],
          [halfW + 1.4, spanZ / 2 + 4], [halfW + 1.4, -spanZ / 2 - 4],
          [halfW - 0.2, spanZ / 2 + 4], [halfW - 0.2, -spanZ / 2 - 4]
        ];
        const yBase = Math.min(...yBasePoints.map(([cx, cz]) =>
          worldService.getHeight(
            spec.x + cx * cosR - cz * sinR,
            spec.z + cx * sinR + cz * cosR
          )
        ));

        const qKey = tileKey(spec.x, spec.z);
        if (!tiles.has(qKey)) tiles.set(qKey, emptyBucket());
        const qBucket = tiles.get(qKey);

        // 1. Extrair malhas estáticas para os buckets do quadrante
        if (bData.group && bData.group.children) {
          const children = [...bData.group.children];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child === bData.interiorProps) {
              // Interiores: mantidos com culling de proximidade (< 20m)
              child.position.set(spec.x, yBase + 0.45, spec.z);
              child.rotation.y = spec.rot || 0;
              child.visible = false;
              scene.add(child);
              RenderOptimizer.registerBuilding(spec.x, yBase, spec.z, null, child, Math.max(bWidth, bDepth));
              continue;
            }

            if (child.isMesh && child.geometry) {
              const geo = child.geometry.clone();
              geo.rotateY(spec.rot || 0);
              geo.translate(spec.x, yBase, spec.z);

              const mat = child.material;
              if (mat === TOON_MATERIALS.CONCRETE_BUNKER || mat === TOON_MATERIALS.OBSIDIAN_CONCRETE) {
                qBucket.concrete.push(geo);
              } else if (mat === TOON_MATERIALS.CYAN_PANEL_METAL || mat === TOON_MATERIALS.AMBER_PANEL_METAL || mat === TOON_MATERIALS.TERRACOTTA_CONCRETE) {
                qBucket.panel.push(geo);
              } else if (mat === TOON_MATERIALS.SHATTERED_GLASS) {
                qBucket.glass.push(geo);
              } else if (mat === TOON_MATERIALS.HANGING_VINES) {
                qBucket.vine.push(geo);
              } else {
                qBucket.iron.push(geo);
              }
            }
          }
        }

        // 2. Registro no SpatialExclusionService (Footprint OBB do Prédio + Recuo de 2.5m)
        spatialExclusionService.registerBuilding(
          spec.id,
          spec.x,
          spec.z,
          bWidth,
          bDepth,
          spec.rot || 0,
          2.5
        );

        // 3. Registro do Corredor de Entrada Desobstruído (Frente da Porta)
        const doorDist = bDepth / 2 + 2.5;
        const doorAngle = spec.rot || 0;
        const entranceX = spec.x + Math.sin(doorAngle) * doorDist;
        const entranceZ = spec.z + Math.cos(doorAngle) * doorDist;

        spatialExclusionService.registerEntrance(
          `${spec.id}_entrance`,
          entranceX,
          entranceZ,
          5.0,
          5.0,
          doorAngle,
          2.5
        );

        // 4. Registro de Colisores de Parede com 4 Vértices Rotacionados
        if (bData.wallColliders) {
          bData.wallColliders.forEach(wall => {
            const c1x = wall.minX * cosR - wall.minZ * sinR;
            const c1z = wall.minX * sinR + wall.minZ * cosR;
            const c2x = wall.minX * cosR - wall.maxZ * sinR;
            const c2z = wall.minX * sinR + wall.maxZ * cosR;
            const c3x = wall.maxX * cosR - wall.minZ * sinR;
            const c3z = wall.maxX * sinR + wall.minZ * cosR;
            const c4x = wall.maxX * cosR - wall.maxZ * sinR;
            const c4z = wall.maxX * sinR + wall.maxZ * cosR;

            const minX = Math.min(c1x, c2x, c3x, c4x);
            const maxX = Math.max(c1x, c2x, c3x, c4x);
            const minZ = Math.min(c1z, c2z, c3z, c4z);
            const maxZ = Math.max(c1z, c2z, c3z, c4z);

            worldService.addCollider({
              type: 'box',
              box: new THREE.Box3(
                new THREE.Vector3(spec.x + minX, yBase + wall.minY, spec.z + minZ),
                new THREE.Vector3(spec.x + maxX, yBase + wall.maxY, spec.z + maxZ)
              )
            });
          });
        }

        const geomW = bData.geomWidth || bWidth;
        const geomD = bData.geomDepth || bDepth;
        const doorW = bData.doorW || 5.0;
        const doorH = bData.doorH || 4.0;
        const foundBoxes = foundationColliders({ width: geomW, depth: geomD, doorW });
        for (let f = 0; f < foundBoxes.length; f++) {
          const w = worldAabbFromLocal(foundBoxes[f], spec.x, spec.z, yBase, cosR, sinR);
          worldService.addCollider({
            type: 'box',
            box: new THREE.Box3(
              new THREE.Vector3(w.minX, w.minY, w.minZ),
              new THREE.Vector3(w.maxX, w.maxY, w.maxZ)
            )
          });
        }

        const doorWorld = worldAabbFromLocal(
          doorwayVolume({ depth: geomD, doorW, doorH }),
          spec.x, spec.z, yBase, cosR, sinR
        );
        worldService.addCollider({
          type: 'doorway',
          minX: doorWorld.minX,
          maxX: doorWorld.maxX,
          minZ: doorWorld.minZ,
          maxZ: doorWorld.maxZ,
          minY: doorWorld.minY,
          maxY: doorWorld.maxY
        });

        // 5. Registro de Lajes de Piso e Degraus de Escada
        if (bData.floorColliders) {
          bData.floorColliders.forEach(floor => {
            const c1x = floor.minX * cosR - floor.minZ * sinR;
            const c1z = floor.minX * sinR + floor.minZ * cosR;
            const c2x = floor.minX * cosR - floor.maxZ * sinR;
            const c2z = floor.minX * sinR + floor.maxZ * cosR;
            const c3x = floor.maxX * cosR - floor.minZ * sinR;
            const c3z = floor.maxX * sinR + floor.minZ * cosR;
            const c4x = floor.maxX * cosR - floor.maxZ * sinR;
            const c4z = floor.maxX * sinR + floor.maxZ * cosR;

            const minX = Math.min(c1x, c2x, c3x, c4x);
            const maxX = Math.max(c1x, c2x, c3x, c4x);
            const minZ = Math.min(c1z, c2z, c3z, c4z);
            const maxZ = Math.max(c1z, c2z, c3z, c4z);

            worldService.addCollider({
              type: 'floor',
              minX: spec.x + minX,
              maxX: spec.x + maxX,
              minZ: spec.z + minZ,
              maxZ: spec.z + maxZ,
              y: yBase + floor.y
            });
          });
        }
      }
    });

    // 6. Malhas fundidas por tile (~40 m). Culling no optimizer (frustum + fog far), não no centro do quadrante.
    tiles.forEach((q, key) => {
      const colon = key.indexOf(':');
      const tx = Number(key.slice(0, colon));
      const tz = Number(key.slice(colon + 1));
      const bounds = tileBounds(tx, tz);
      const qGroup = new THREE.Group();
      qGroup.userData.tileBox = bounds;
      qGroup.userData.tileCx = (bounds.minX + bounds.maxX) * 0.5;
      qGroup.userData.tileCz = (bounds.minZ + bounds.maxZ) * 0.5;

      if (q.concrete.length > 0) {
        const merged = mergeBufferGeometries(q.concrete);
        if (merged) {
          const mesh = new THREE.Mesh(merged, TOON_MATERIALS.CONCRETE_BUNKER);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.userData.castShadowWhenNear = true;
          qGroup.add(mesh);
        }
      }

      if (q.panel.length > 0) {
        const merged = mergeBufferGeometries(q.panel);
        if (merged) {
          const mesh = new THREE.Mesh(merged, TOON_MATERIALS.CYAN_PANEL_METAL);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.userData.castShadowWhenNear = false;
          qGroup.add(mesh);
        }
      }

      if (q.iron.length > 0) {
        const merged = mergeBufferGeometries(q.iron);
        if (merged) {
          const mesh = new THREE.Mesh(merged, TOON_MATERIALS.RUST_WRECK);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.userData.castShadowWhenNear = false;
          qGroup.add(mesh);
        }
      }

      if (q.glass.length > 0) {
        const merged = mergeBufferGeometries(q.glass);
        if (merged) {
          const mesh = new THREE.Mesh(merged, TOON_MATERIALS.SHATTERED_GLASS);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.userData.castShadowWhenNear = false;
          qGroup.add(mesh);
        }
      }

      if (q.vine.length > 0) {
        const merged = mergeBufferGeometries(q.vine);
        if (merged) {
          const mesh = new THREE.Mesh(merged, TOON_MATERIALS.HANGING_VINES);
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.userData.castShadowWhenNear = false;
          qGroup.add(mesh);
        }
      }

      scene.add(qGroup);
      RenderOptimizer.registerTile(qGroup, qGroup.userData.tileCx, qGroup.userData.tileCz);
    });
  }

  /**
   * Validador SAT de Não-Sobreposição entre todos os lotes de edifícios
   */
  static validateZeroOverlap(specs) {
    for (let i = 0; i < specs.length; i++) {
      const a = specs[i];
      const aW = a.w || (a.r ? a.r * 2 : (a.s || 20));
      const aD = a.d || (a.r ? a.r * 2 : (a.s || 20));
      const aR = Math.hypot(aW / 2, aD / 2);

      for (let j = i + 1; j < specs.length; j++) {
        const b = specs[j];
        const bW = b.w || (b.r ? b.r * 2 : (b.s || 20));
        const bD = b.d || (b.r ? b.r * 2 : (b.s || 20));
        const bR = Math.hypot(bW / 2, bD / 2);

        const dist = Math.hypot(a.x - b.x, a.z - b.z);
        if (dist < (aR + bR - 1.0)) {
          console.warn(`[CityLayoutManager] ALERTA DE PROXIMIDADE entre ${a.id} e ${b.id}: Distância ${dist.toFixed(1)}m < Min ${(aR + bR).toFixed(1)}m`);
        }
      }
    }
  }
}
