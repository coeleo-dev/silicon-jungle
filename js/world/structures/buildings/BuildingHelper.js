/**
 * BuildingHelper.js — Rotinas Utilitárias e Componentes Paramétricos para Edifícios
 */
import {
  fireEscapeLayout,
  STAIR_W,
  RAIL_THICK,
  RAIL_H,
  BACK_WALL_H,
  STEP_THICK
} from './stairLayout.js?v=20260821';
import { InteriorPropsFactory } from '../InteriorPropsFactory.js?v=20260821';

export class BuildingHelper {
  /**
   * Cria esquadrias de janelas com profundidade e cacos de vidro quebrado translúcidos
   */
  static addWindowGrid(ironGeos, glassGeos, x, y, z, w, h, facingAxis = 'z') {
    const frame = new THREE.BoxGeometry(w, h, 0.35);
    const barV = new THREE.BoxGeometry(0.08, h, 0.38);
    const barH = new THREE.BoxGeometry(w, 0.08, 0.38);

    const glassShard1 = new THREE.BoxGeometry(w * 0.4, h * 0.55, 0.04);
    glassShard1.rotateZ(0.12);
    glassShard1.translate(-w * 0.22, -h * 0.15, 0);

    const glassShard2 = new THREE.BoxGeometry(w * 0.35, h * 0.45, 0.04);
    glassShard2.rotateZ(-0.2);
    glassShard2.translate(w * 0.25, h * 0.18, 0);

    if (facingAxis === 'x') {
      frame.rotateY(Math.PI / 2);
      barV.rotateY(Math.PI / 2);
      barH.rotateY(Math.PI / 2);
      glassShard1.rotateY(Math.PI / 2);
      glassShard2.rotateY(Math.PI / 2);
    }

    frame.translate(x, y, z);
    barV.translate(x, y, z);
    barH.translate(x, y, z);
    glassShard1.translate(x, y, z);
    glassShard2.translate(x, y, z);

    ironGeos.push(frame, barV, barH);
    glassGeos.push(glassShard1, glassShard2);
  }

  /**
   * Adiciona lianas e trepadeiras penduradas descendo pelas fachadas
   */
  static addHangingVines(vineGeos, x, y, z, length = 6.0) {
    const vineCount = 5 + Math.floor(Math.random() * 4);
    for (let i = 0; i < vineCount; i++) {
      const vLen = length * (0.6 + Math.random() * 0.6);
      const vine = new THREE.CylinderGeometry(0.04, 0.06, vLen, 4);
      vine.rotateZ((Math.random() - 0.5) * 0.15);
      vine.translate(x + (i - 1) * 0.35, y - vLen / 2, z + (Math.random() - 0.5) * 0.2);
      vineGeos.push(vine);
    }
  }

  /**
   * Escada de incêndio com patamares em U (pad além do lance + parede de fundo)
   * e degraus sólidos (box baixa, auto-step). Telhado continua como laje floor.
   */
  static addRoofFireEscapeStairs(ironGeos, floorColliders, wallColliders, width, depth, height) {
    const layout = fireEscapeLayout({ width, depth, height });
    const { flightH, landings, flights } = layout;
    const railHalf = RAIL_THICK / 2;

    // 1. Patamares em U — caixa sólida; collider só no pad (não cobre o lance)
    for (const pad of landings) {
      const platY = pad.y;
      const padDepth = pad.maxZ - pad.minZ;
      const padCenterZ = (pad.minZ + pad.maxZ) / 2;
      const padCenterX = (pad.minX + pad.maxX) / 2;
      const padWidth = pad.maxX - pad.minX;

      const platGeo = new THREE.BoxGeometry(padWidth, STEP_THICK, padDepth);
      platGeo.translate(padCenterX, platY + STEP_THICK / 2, padCenterZ);
      ironGeos.push(platGeo);

      wallColliders.push({
        minX: pad.minX, maxX: pad.maxX,
        minZ: pad.minZ, maxZ: pad.maxZ,
        minY: platY, maxY: platY + STEP_THICK
      });

      // Mureta só no lado de fora (maxX): o lado interno liga ao prédio / ponte do teto
      wallColliders.push({
        minX: pad.maxX - railHalf, maxX: pad.maxX + railHalf,
        minZ: pad.minZ, maxZ: pad.maxZ,
        minY: platY, maxY: platY + RAIL_H
      });

      if (pad.hasBackWall) {
        const wallZ = pad.outerZ;
        const wallGeo = new THREE.BoxGeometry(padWidth, BACK_WALL_H, RAIL_THICK);
        wallGeo.translate(padCenterX, platY + BACK_WALL_H / 2, wallZ);
        ironGeos.push(wallGeo);
        wallColliders.push({
          minX: pad.minX, maxX: pad.maxX,
          minZ: wallZ - railHalf, maxZ: wallZ + railHalf,
          minY: platY, maxY: platY + BACK_WALL_H
        });
      }
    }

    // 2. Degraus sólidos (box 0.35m) com pouca sobreposição Z
    for (const flight of flights) {
      const startY = flight.f * flightH;
      let railMinZ = Infinity;
      let railMaxZ = -Infinity;

      for (const step of flight.steps) {
        const stepDepth = Math.max(0.7, flight.stepRun + 0.15);
        const stepGeo = new THREE.BoxGeometry(STAIR_W, STEP_THICK, stepDepth);
        stepGeo.translate(step.x, step.y + STEP_THICK / 2, step.z);
        ironGeos.push(stepGeo);

        wallColliders.push({
          minX: step.minX, maxX: step.maxX,
          minZ: step.minZ, maxZ: step.maxZ,
          minY: step.y, maxY: step.y + STEP_THICK
        });

        railMinZ = Math.min(railMinZ, step.minZ);
        railMaxZ = Math.max(railMaxZ, step.maxZ);
      }

      wallColliders.push(
        {
          minX: flight.cx - STAIR_W / 2 - railHalf, maxX: flight.cx - STAIR_W / 2 + railHalf,
          minZ: railMinZ, maxZ: railMaxZ,
          minY: startY, maxY: startY + flightH + RAIL_H
        },
        {
          minX: flight.cx + STAIR_W / 2 - railHalf, maxX: flight.cx + STAIR_W / 2 + railHalf,
          minZ: railMinZ, maxZ: railMaxZ,
          minY: startY, maxY: startY + flightH + RAIL_H
        }
      );
    }

    // 3. Passarela do topo para o telhado (até o lance que chega no último patamar)
    const topPad = landings[landings.length - 1];
    const lastFlight = flights[flights.length - 1];
    const topPlatZ = topPad.meetZ;
    const bridgeMinX = width / 2 - 0.5;
    const bridgeMaxX = lastFlight.cx + STAIR_W / 2;
    const bridgeW = bridgeMaxX - bridgeMinX;
    const bridgeCX = (bridgeMinX + bridgeMaxX) / 2;
    const roofBridge = new THREE.BoxGeometry(bridgeW, STEP_THICK, 3.0);
    roofBridge.translate(bridgeCX, height + STEP_THICK / 2, topPlatZ);
    ironGeos.push(roofBridge);

    floorColliders.push({
      minX: bridgeMinX,
      maxX: Math.max(bridgeMaxX, topPad.maxX),
      minZ: topPlatZ - 1.8,
      maxZ: topPlatZ + 1.8,
      y: height + STEP_THICK
    });

    // 4. Laje sólida do telhado
    floorColliders.push({
      minX: -width / 2 + 0.2,
      maxX: width / 2 - 0.2,
      minZ: -depth / 2 + 0.2,
      maxZ: depth / 2 - 0.2,
      y: height + STEP_THICK
    });
  }

  /**
   * Adiciona laje de telhado VISÍVEL + parapeitos com colisão (Norte/Sul/Oeste) +
   * 2 plataformas de tiro elevadas nos cantos NO e SE.
   * Topo da laje alinhado ao floor collider existente (height + 0.35) de addRoofFireEscapeStairs.
   * Lado Leste (x = +width/2) fica SEM parapeito: é o lado da escada de incêndio (acesso livre do roof bridge).
   */
  static addRoofAndParapet(concreteGeos, ironGeos, floorColliders, wallColliders, width, depth, height) {
    const parapetH = 1.0;
    const parapetThick = 0.3;

    // (a) Laje de telhado VISÍVEL — topo em height + 0.35 (alinha com o floor collider existente)
    const roofSlab = new THREE.BoxGeometry(width + 0.4, 0.3, depth + 0.4);
    roofSlab.translate(0, height + 0.2, 0);
    concreteGeos.push(roofSlab);

    // (b) Parapeitos (mureta 1.0m, base na cota do telhado): Norte, Sul e Oeste — SEM Leste
    const parapetN = new THREE.BoxGeometry(width + 0.4, parapetH, parapetThick);
    parapetN.translate(0, height + 0.85, -depth / 2);
    concreteGeos.push(parapetN);

    const parapetS = new THREE.BoxGeometry(width + 0.4, parapetH, parapetThick);
    parapetS.translate(0, height + 0.85, depth / 2);
    concreteGeos.push(parapetS);

    const parapetW = new THREE.BoxGeometry(parapetThick, parapetH, depth + 0.4);
    parapetW.translate(-width / 2, height + 0.85, 0);
    concreteGeos.push(parapetW);

    // Colliders dos parapeitos (coordenadas LOCAIS; CityLayoutManager rotaciona/translada depois)
    wallColliders.push(
      { minX: -width / 2 - 0.2, maxX: width / 2 + 0.2, minZ: -depth / 2 - 0.15, maxZ: -depth / 2 + 0.15, minY: height + 0.35, maxY: height + 1.35 },
      { minX: -width / 2 - 0.2, maxX: width / 2 + 0.2, minZ: depth / 2 - 0.15, maxZ: depth / 2 + 0.15, minY: height + 0.35, maxY: height + 1.35 },
      { minX: -width / 2 - 0.15, maxX: -width / 2 + 0.15, minZ: -depth / 2 - 0.2, maxZ: depth / 2 + 0.2, minY: height + 0.35, maxY: height + 1.35 }
    );

    // (c) 2 plataformas de tiro elevadas 1.4m acima da laje (base height+1.75, topo height+2.05)
    const platSize = 3.5;
    const platHalf = platSize / 2;
    const platforms = [
      { cx: -width / 2 + 3.2, cz: -depth / 2 + 3.2, dirX: -1, dirZ: -1 }, // canto NO
      { cx: width / 2 - 3.2, cz: depth / 2 - 3.2, dirX: 1, dirZ: 1 }      // canto SE
    ];

    platforms.forEach(p => {
      const { cx, cz } = p;
      const outerX = cx + p.dirX * platHalf; // borda externa (lado do parapeito)
      const outerZ = cz + p.dirZ * platHalf; // borda externa (lado oposto ao centro do telhado)

      // Piso da plataforma (topo = height + 2.05, alinhado ao floor collider abaixo)
      const plat = new THREE.BoxGeometry(platSize, 0.3, platSize);
      plat.translate(cx, height + 1.9, cz);
      concreteGeos.push(plat);

      floorColliders.push({
        minX: cx - platHalf,
        maxX: cx + platHalf,
        minZ: cz - platHalf,
        maxZ: cz + platHalf,
        y: height + 2.05
      });

      // Mureta baixa (0.6 altura, espessura 0.25) — lado do parapeito (borda X externa)
      const muretaX = new THREE.BoxGeometry(0.25, 0.6, platSize);
      muretaX.translate(outerX, height + 2.05, cz);
      concreteGeos.push(muretaX);
      wallColliders.push({
        minX: outerX - 0.125, maxX: outerX + 0.125, minZ: cz - platHalf, maxZ: cz + platHalf, minY: height + 1.75, maxY: height + 2.35
      });

      // Mureta baixa — lado oposto ao centro do telhado (borda Z externa)
      const muretaZ = new THREE.BoxGeometry(platSize, 0.6, 0.25);
      muretaZ.translate(cx, height + 2.05, outerZ);
      concreteGeos.push(muretaZ);
      wallColliders.push({
        minX: cx - platHalf, maxX: cx + platHalf, minZ: outerZ - 0.125, maxZ: outerZ + 0.125, minY: height + 1.75, maxY: height + 2.35
      });

      // Caixas de cobertura (InteriorPropsFactory — mesmo tipo das caixas internas)
      const coverX = cx - p.dirX * 1.3;
      const coverZ = cz - p.dirZ * 1.3;
      InteriorPropsFactory.appendRooftopCover(ironGeos, wallColliders, coverX, height + 2.05, coverZ);
    });
  }

  /**
   * Kit de fachada só visual (D3). Não cria colisores.
   */
  static addFacadeKit(concreteGeos, ironGeos, {
    width,
    depth,
    height,
    doorW = 5,
    doorH = 4,
    style = 'shop',
    radius = 0
  } = {}) {
    const outset = 0.4;
    if (style === 'silo' && radius > 0) {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const rib = new THREE.BoxGeometry(0.32, height * 0.88, 0.32);
        rib.translate(Math.sin(a) * (radius + 0.14), height * 0.48, Math.cos(a) * (radius + 0.14));
        concreteGeos.push(rib);
      }
      const ring = new THREE.TorusGeometry(radius + 0.18, 0.22, 6, 14);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, height + 0.15, 0);
      ironGeos.push(ring);
      const ac = new THREE.BoxGeometry(1.1, 0.65, 0.7);
      ac.translate(radius * 0.25, height * 0.58, radius + 0.45);
      ironGeos.push(ac);
      return;
    }

    const hw = width / 2;
    const hd = depth / 2;
    const pilasterCount = style === 'tower' ? 5 : 4;
    for (let i = 0; i < pilasterCount; i++) {
      const x = -hw + (i / (pilasterCount - 1)) * width;
      for (const zSign of [-1, 1]) {
        const p = new THREE.BoxGeometry(0.42, height * 0.9, 0.42);
        p.translate(x * 0.96, height * 0.47, zSign * (hd + 0.14));
        concreteGeos.push(p);
      }
    }
    for (const xSign of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const z = -hd + (i / 2) * depth;
        const p = new THREE.BoxGeometry(0.42, height * 0.9, 0.42);
        p.translate(xSign * (hw + 0.14), height * 0.47, z * 0.96);
        concreteGeos.push(p);
      }
    }

    const corniceS = new THREE.BoxGeometry(width + 0.7, 0.38, 0.65);
    corniceS.translate(0, height + 0.22, hd + 0.12);
    concreteGeos.push(corniceS);
    const corniceN = new THREE.BoxGeometry(width + 0.7, 0.38, 0.65);
    corniceN.translate(0, height + 0.22, -hd - 0.12);
    concreteGeos.push(corniceN);

    const slab = new THREE.BoxGeometry(width * 0.7, 0.2, 0.5);
    slab.translate(0, height * 0.7, hd + outset);
    concreteGeos.push(slab);

    if (style !== 'ruin') {
      const awning = new THREE.BoxGeometry(doorW + 2.0, 0.16, 1.7);
      awning.translate(0, doorH + 0.32, hd + 0.95);
      ironGeos.push(awning);
    }

    const ac = new THREE.BoxGeometry(1.35, 0.75, 0.85);
    ac.translate(hw + 0.5, height * 0.6, hd * 0.2);
    ironGeos.push(ac);
    if (style === 'tower') {
      const ac2 = new THREE.BoxGeometry(1.1, 0.6, 0.7);
      ac2.translate(-hw - 0.45, height * 0.75, 0);
      ironGeos.push(ac2);
    }
  }
}
