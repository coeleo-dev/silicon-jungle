/**
 * TreeFactory — Fábrica de Modelagem Botânica Orgânica e Volumétrica (Selva Amazônica)
 * Produz árvores com troncos detalhados fincados no solo, galhos em múltiplos níveis e
 * folhagens densas e volumétricas combinando folhas grandes, médias e pequenas.
 */

/**
 * Utilitário de fusão de BufferGeometries
 */
export function mergeBufferGeometries(geometries) {
  let totalVerts = 0;
  let totalIndices = 0;

  geometries.forEach(g => {
    totalVerts += g.attributes.position.count;
    if (g.index) totalIndices += g.index.count;
    else totalIndices += (g.attributes.position.count / 3) * 3;
  });

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const uvs = new Float32Array(totalVerts * 2);
  const indices = new (totalVerts > 65535 ? Uint32Array : Uint16Array)(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  geometries.forEach(g => {
    const pos = g.attributes.position;
    const norm = g.attributes.normal;
    const uv = g.attributes.uv;

    for (let i = 0; i < pos.count; i++) {
      positions[(vOffset + i) * 3] = pos.getX(i);
      positions[(vOffset + i) * 3 + 1] = pos.getY(i);
      positions[(vOffset + i) * 3 + 2] = pos.getZ(i);

      if (norm) {
        normals[(vOffset + i) * 3] = norm.getX(i);
        normals[(vOffset + i) * 3 + 1] = norm.getY(i);
        normals[(vOffset + i) * 3 + 2] = norm.getZ(i);
      } else {
        normals[(vOffset + i) * 3 + 1] = 1.0;
      }

      if (uv) {
        uvs[(vOffset + i) * 2] = uv.getX(i);
        uvs[(vOffset + i) * 2 + 1] = uv.getY(i);
      }
    }

    if (g.index) {
      for (let i = 0; i < g.index.count; i++) {
        indices[iOffset + i] = g.index.getX(i) + vOffset;
      }
      iOffset += g.index.count;
    } else {
      for (let i = 0; i < pos.count; i++) {
        indices[iOffset + i] = vOffset + i;
      }
      iOffset += pos.count;
    }

    vOffset += pos.count;
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.computeVertexNormals();

  return merged;
}

/**
 * Cria tronco cônico orgânico detalhado, curvado e com base que se estende abaixo do solo (y = -0.8m)
 * para garantir que as árvores fiquem 100% plantadas e fixadas na terra sem flutuar.
 */
export function createDetailedOrganicTrunk(height, baseRadius, topRadius, segments = 10, radialSegs = 10, curveOffset = 0.5, startY = -0.8) {
  const points = [];
  const numPoints = 7;
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const y = startY + t * (height - startY);
    const x = Math.sin(t * Math.PI) * curveOffset * 0.75;
    const z = Math.cos(t * Math.PI * 0.6) * (curveOffset * 0.5);
    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = curve.getPointAt(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];

    // Alargamento exponencial contínuo na base até o solo
    const rootFlare = Math.exp(-t * 4.2) * (baseRadius * 0.85);
    const r = (baseRadius * (1.0 - t * 0.72) + topRadius * (t * 0.72)) + rootFlare;

    for (let j = 0; j <= radialSegs; j++) {
      const u = j / radialSegs;
      const angle = u * Math.PI * 2;
      // Sutil relevo natural na casca
      const barkNoise = 1.0 + Math.sin(angle * 5.0 + t * 12.0) * 0.04;
      const finalR = r * barkNoise;

      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);

      const vx = pt.x + (N.x * cosA + B.x * sinA) * finalR;
      const vy = pt.y + (N.y * cosA + B.y * sinA) * finalR;
      const vz = pt.z + (N.z * cosA + B.z * sinA) * finalR;

      positions.push(vx, vy, vz);
      normals.push(N.x * cosA + B.x * sinA, N.y * cosA + B.y * sinA, N.z * cosA + B.z * sinA);
      uvs.push(u * 2.0, t * 4.0);
    }
  }

  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegs; j++) {
      const a = i * (radialSegs + 1) + j;
      const b = (i + 1) * (radialSegs + 1) + j;
      const c = (i + 1) * (radialSegs + 1) + (j + 1);
      const d = i * (radialSegs + 1) + (j + 1);

      indices.push(a, d, b);
      indices.push(b, d, c);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Cria cúpula de folhagem orgânica combinando folhas grandes e pequenas em camadas volumétricas
 */
export function createVolumetricLeafCluster(radius = 5.0, numMainPetals = 12, numDetailPetals = 8) {
  const parts = [];

  // 1. Folhas Principais (Grandes)
  for (let p = 0; p < numMainPetals; p++) {
    const angle = (p / numMainPetals) * Math.PI * 2;
    const pitch = 0.4 + (p % 3) * 0.18;
    const petalW = radius * 1.25;
    const petalH = radius * 1.45;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const segsU = 3;
    const segsV = 4;

    for (let iv = 0; iv <= segsV; iv++) {
      const tv = iv / segsV;
      for (let iu = 0; iu <= segsU; iu++) {
        const tu = iu / segsU;
        const x = (tu - 0.5) * petalW;
        const z = tv * petalH;
        const curveY = -Math.sin(tu * Math.PI) * (petalW * 0.28) - Math.pow(tv, 1.7) * (petalH * 0.35);

        positions.push(x, curveY, z);
        normals.push(x / radius, 1.0, z / radius);
        uvs.push(tu, tv);
      }
    }

    for (let iv = 0; iv < segsV; iv++) {
      for (let iu = 0; iu < segsU; iu++) {
        const a = iv * (segsU + 1) + iu;
        const b = (iv + 1) * (segsU + 1) + iu;
        const c = (iv + 1) * (segsU + 1) + (iu + 1);
        const d = iv * (segsU + 1) + (iu + 1);

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    const petalGeo = new THREE.BufferGeometry();
    petalGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    petalGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    petalGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    petalGeo.setIndex(indices);
    petalGeo.computeVertexNormals();

    petalGeo.rotateX(-pitch);
    petalGeo.rotateY(angle);
    petalGeo.translate(Math.cos(angle) * (radius * 0.35), Math.sin(pitch) * (radius * 0.25), Math.sin(angle) * (radius * 0.35));

    parts.push(petalGeo);
  }

  // 2. Folhas Menores de Detalhe e Preenchimento
  for (let d = 0; d < numDetailPetals; d++) {
    const angle = (d / numDetailPetals) * Math.PI * 2 + 0.3;
    const detailW = radius * 0.75;
    const detailH = radius * 0.9;
    const pitch = 0.55 + (d % 2) * 0.2;

    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];

    const segsU = 2;
    const segsV = 3;

    for (let iv = 0; iv <= segsV; iv++) {
      const tv = iv / segsV;
      for (let iu = 0; iu <= segsU; iu++) {
        const tu = iu / segsU;
        const x = (tu - 0.5) * detailW;
        const z = tv * detailH;
        const curveY = -Math.sin(tu * Math.PI) * (detailW * 0.25) - Math.pow(tv, 1.6) * (detailH * 0.3);

        positions.push(x, curveY, z);
        normals.push(x / radius, 1.0, z / radius);
        uvs.push(tu, tv);
      }
    }

    for (let iv = 0; iv < segsV; iv++) {
      for (let iu = 0; iu < segsU; iu++) {
        const a = iv * (segsU + 1) + iu;
        const b = (iv + 1) * (segsU + 1) + iu;
        const c = (iv + 1) * (segsU + 1) + (iu + 1);
        const d = iv * (segsU + 1) + (iu + 1);

        indices.push(a, d, b);
        indices.push(b, d, c);
      }
    }

    const detailGeo = new THREE.BufferGeometry();
    detailGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    detailGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    detailGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    detailGeo.setIndex(indices);
    detailGeo.computeVertexNormals();

    detailGeo.rotateX(-pitch);
    detailGeo.rotateY(angle);
    detailGeo.translate(Math.cos(angle) * (radius * 0.55), Math.sin(pitch) * (radius * 0.4) - 0.2, Math.sin(angle) * (radius * 0.55));

    parts.push(detailGeo);
  }

  // 3. Núcleo Interno de Densidade Volumétrica
  const domeCore = new THREE.SphereGeometry(radius * 0.75, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.65);
  domeCore.scale(1.2, 0.85, 1.2);
  domeCore.translate(0, radius * 0.28, 0);
  parts.push(domeCore);

  return mergeBufferGeometries(parts);
}

/**
 * Cria Fronde de Palmeira Realista com folíolos arqueados
 */
export function createRealisticPalmFrond(length = 10.5, width = 3.2, segments = 8) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const z = t * length;
    const y = Math.sin(t * Math.PI * 0.7) * (length * 0.3) - Math.pow(t, 2.0) * (length * 0.5);
    const w = Math.sin(t * Math.PI) * (width * 0.55);
    const ribY = y + 0.18 * Math.sin(t * Math.PI);

    positions.push(-w, y, z);
    normals.push(-0.3, 0.9, -0.1);
    uvs.push(0.0, t);

    positions.push(0.0, ribY, z);
    normals.push(0.0, 1.0, 0.0);
    uvs.push(0.5, t);

    positions.push(w, y, z);
    normals.push(0.3, 0.9, -0.1);
    uvs.push(1.0, t);
  }

  for (let i = 0; i < segments; i++) {
    const row1 = i * 3;
    const row2 = (i + 1) * 3;

    indices.push(row1, row2, row1 + 1);
    indices.push(row1 + 1, row2, row2 + 1);

    indices.push(row1 + 1, row1 + 2, row2 + 1);
    indices.push(row1 + 2, row2 + 2, row2 + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const parts = [geo];
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const z = t * length;
    const y = Math.sin(t * Math.PI * 0.7) * (length * 0.3) - Math.pow(t, 2.0) * (length * 0.5);
    const leafletLen = Math.sin(t * Math.PI) * width * 0.9;
    for (const side of [-1, 1]) {
      const leaf = new THREE.BoxGeometry(leafletLen, 0.03, 0.14);
      leaf.translate(side * leafletLen * 0.52, y, z);
      parts.push(leaf);
    }
  }
  return mergeBufferGeometries(parts);
}

/**
 * Cria Coroa de Palmeira em 4 níveis de frondes (Grandes, Médias e Pequenas)
 */
export function createRealisticPalmCrown(trunkHeight = 20) {
  const frondGeos = [];

  // Nível 1: Frondes Grandes e Longas (Pendentes)
  for (let i = 0; i < 10; i++) {
    const frond = createRealisticPalmFrond(12.0, 3.8, 8);
    const angle = (i / 10) * Math.PI * 2;
    frond.rotateZ(0.18 + (i % 3) * 0.08);
    frond.rotateY(angle);
    frond.translate(0, trunkHeight - 0.5, 0);
    frondGeos.push(frond);
  }

  // Nível 2: Frondes Médias (Arqueadas)
  for (let i = 0; i < 8; i++) {
    const frond = createRealisticPalmFrond(10.0, 3.2, 8);
    const angle = (i / 8) * Math.PI * 2 + 0.35;
    frond.rotateZ(0.02 + (i % 2) * 0.12);
    frond.rotateY(angle);
    frond.translate(0, trunkHeight, 0);
    frondGeos.push(frond);
  }

  // Nível 3: Frondes Pequenas (Intermediárias)
  for (let i = 0; i < 6; i++) {
    const frond = createRealisticPalmFrond(8.0, 2.5, 7);
    const angle = (i / 6) * Math.PI * 2 + 0.6;
    frond.rotateZ(-0.15);
    frond.rotateY(angle);
    frond.translate(0, trunkHeight + 0.25, 0);
    frondGeos.push(frond);
  }

  // Nível 4: Frondes Jovens de Topo (Eretas)
  for (let i = 0; i < 4; i++) {
    const frond = createRealisticPalmFrond(6.0, 1.9, 6);
    const angle = (i / 4) * Math.PI * 2 + 0.9;
    frond.rotateZ(-0.35);
    frond.rotateY(angle);
    frond.translate(0, trunkHeight + 0.45, 0);
    frondGeos.push(frond);
  }

  return mergeBufferGeometries(frondGeos);
}

/**
 * Cria uma versão SIMPLIFICADA (LOD1) do tronco a partir da geometria cheia.
 * Um cilindro de baixa segmentação dimensionado pelo bounding box — para árvores distantes.
 */
export function createSimpleTrunkLOD(fullTrunkGeo) {
  if (!fullTrunkGeo.boundingBox) fullTrunkGeo.computeBoundingBox();
  const bb = fullTrunkGeo.boundingBox;
  const h = bb.max.y - bb.min.y;
  const baseR = Math.max(bb.max.x, Math.abs(bb.min.x)) * 0.9;
  const topR = baseR * 0.35;
  const geo = new THREE.CylinderGeometry(topR, baseR, h, 5);
  geo.translate(0, (bb.min.y + bb.max.y) / 2, 0);
  return geo;
}


function createUmbrellaCanopy(radius, y, flatten = 0.32) {
  const parts = [];
  const core = new THREE.SphereGeometry(radius * 0.55, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55);
  core.scale(1.6, flatten, 1.6);
  core.translate(0, y, 0);
  parts.push(core);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const clump = new THREE.SphereGeometry(radius * 0.38, 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.6);
    clump.scale(1.55, flatten * 1.15, 1.55);
    clump.translate(Math.cos(a) * radius * 0.88, y - radius * 0.14, Math.sin(a) * radius * 0.88);
    parts.push(clump);
  }
  return mergeBufferGeometries(parts);
}

function createPlateButtresses(baseRadius, count = 6) {
  const parts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.1;
    const len = 5.8;
    const plate = new THREE.BoxGeometry(0.16, 3.5, len);
    plate.translate(0, 1.45, len * 0.42);
    plate.rotateY(a);
    parts.push(plate);
  }
  return parts;
}

function createFlattenedDiskCanopyLOD(radius) {
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const disk = new THREE.SphereGeometry(radius * (0.72 - i * 0.08), 6, 4, 0, Math.PI * 2, 0, Math.PI * 0.5);
    disk.scale(1.45, 0.28, 1.45);
    const a = (i / 3) * Math.PI * 2;
    disk.translate(Math.cos(a) * radius * 0.18, i * radius * 0.1, Math.sin(a) * radius * 0.18);
    parts.push(disk);
  }
  return mergeBufferGeometries(parts);
}

function createStarPalmCanopyLOD(radius) {
  const parts = [];
  for (let i = 0; i < 6; i++) {
    const frond = new THREE.BoxGeometry(radius * 0.16, 0.07, radius * 1.55);
    frond.rotateZ(0.18);
    frond.rotateY((i / 6) * Math.PI * 2);
    parts.push(frond);
  }
  return mergeBufferGeometries(parts);
}

/**
 * LOD1: palmeira = estrela de frondes; latifoliadas = 2–3 discos achatados.
 */
export function createSimpleCanopyLOD(fullCanopyGeo, kind = 'broadleaf') {
  if (!fullCanopyGeo.boundingBox) fullCanopyGeo.computeBoundingBox();
  const bb = fullCanopyGeo.boundingBox;
  const r = Math.max(bb.max.x, Math.abs(bb.min.x), bb.max.z, Math.abs(bb.min.z)) * 1.05;
  const cy = (bb.min.y + bb.max.y) / 2;
  const geo = kind === 'palm' ? createStarPalmCanopyLOD(r) : createFlattenedDiskCanopyLOD(r);
  geo.translate(0, cy, 0);
  return geo;
}

export class TreeFactory {
  /**
   * 1. Sumaúma emergente — copa guarda-chuva achatada, sapopemas em placa, tronco alto.
   */
  static createSumaumaTree(height = 28, baseRadius = 2.4) {
    const trunkParts = [];

    const mainTrunk = createDetailedOrganicTrunk(height * 0.72, baseRadius, baseRadius * 0.42, 10, 10, 0.18, -1.0);
    trunkParts.push(mainTrunk);
    trunkParts.push(...createPlateButtresses(baseRadius, 6));

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const branchGeo = createDetailedOrganicTrunk(height * 0.38, baseRadius * 0.28, baseRadius * 0.12, 6, 6, 0.4, 0);
      branchGeo.rotateZ(0.82);
      branchGeo.rotateY(angle);
      branchGeo.translate(Math.cos(angle) * 1.0, height * 0.68, Math.sin(angle) * 1.0);
      trunkParts.push(branchGeo);

      const lianaGeo = createDetailedOrganicTrunk(height * 0.55, 0.07, 0.03, 7, 4, 0.85, 0);
      lianaGeo.translate(Math.cos(angle) * (height * 0.28), height * 0.2, Math.sin(angle) * (height * 0.28));
      trunkParts.push(lianaGeo);
    }

    const trunkGeometry = mergeBufferGeometries(trunkParts);
    const canopyGeometry = createUmbrellaCanopy(11.5, height * 0.92, 0.30);
    return { trunkGeometry, canopyGeometry };
  }

  /**
   * 2. Palmeira — tronco esbelto, coroa pinada assimétrica.
   */
  static createPalmTree(height = 20) {
    const trunkGeometry = createDetailedOrganicTrunk(height, 0.85, 0.32, 10, 9, 0.35, -0.8);
    const canopyGeometry = createRealisticPalmCrown(height);
    return { trunkGeometry, canopyGeometry };
  }

  /**
   * 3. Banyan / mata-pau — raízes aéreas até o chão, copa irregular e baixa nas bordas.
   */
  static createBanyanTree(height = 16, baseRadius = 1.4) {
    const trunkParts = [];
    const mainTrunk = createDetailedOrganicTrunk(height * 0.55, baseRadius, baseRadius * 0.55, 9, 9, 0.45, -0.9);
    trunkParts.push(mainTrunk);

    for (let c = 0; c < 4; c++) {
      const angle = (c / 4) * Math.PI * 2 + 0.35;
      const subTrunk = createDetailedOrganicTrunk(height * 0.48, baseRadius * 0.45, baseRadius * 0.25, 7, 6, 0.35, -0.8);
      subTrunk.rotateZ(0.12);
      subTrunk.rotateY(angle);
      subTrunk.translate(Math.cos(angle) * (baseRadius * 0.5), 0, Math.sin(angle) * (baseRadius * 0.5));
      trunkParts.push(subTrunk);
    }

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const dist = height * (0.22 + (i % 3) * 0.08);
      const aerialRoot = createDetailedOrganicTrunk(height * 0.82, 0.11, 0.045, 6, 5, 0.18, -0.7);
      aerialRoot.translate(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      trunkParts.push(aerialRoot);
    }

    for (let i = 0; i < 2; i++) {
      const angle = i * Math.PI + 0.4;
      const liana = createDetailedOrganicTrunk(height * 0.7, 0.06, 0.025, 6, 4, 0.9, 0);
      liana.translate(Math.cos(angle) * (height * 0.3), height * 0.15, Math.sin(angle) * (height * 0.3));
      trunkParts.push(liana);
    }

    const branchAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
    branchAngles.forEach((angle) => {
      const branchGeo = createDetailedOrganicTrunk(height * 0.45, baseRadius * 0.4, baseRadius * 0.18, 6, 6, 0.4, 0);
      branchGeo.rotateZ(0.55);
      branchGeo.rotateY(angle);
      branchGeo.translate(Math.cos(angle) * 0.6, height * 0.5, Math.sin(angle) * 0.6);
      trunkParts.push(branchGeo);
    });

    const trunkGeometry = mergeBufferGeometries(trunkParts);

    const canopyClusters = [];
    const topCluster = createUmbrellaCanopy(6.4, height * 0.88, 0.38);
    canopyClusters.push(topCluster);
    branchAngles.forEach((angle, idx) => {
      const clump = createVolumetricLeafCluster(4.2, 8, 5);
      clump.scale(1.35, 0.45, 1.35);
      clump.translate(Math.cos(angle) * 5.6, height * (0.52 + idx * 0.08), Math.sin(angle) * 5.6);
      canopyClusters.push(clump);
    });
    const canopyGeometry = mergeBufferGeometries(canopyClusters);
    return { trunkGeometry, canopyGeometry };
  }

  /**
   * 4. Embaúba — copa só no topo (candelabro + folhas palminérveas).
   */
  static createEmbaubaTree(height = 13, baseRadius = 0.58) {
    const trunkParts = [];
    const mainTrunk = createDetailedOrganicTrunk(height * 0.82, baseRadius * 0.85, baseRadius * 0.4, 8, 7, 0.12, -0.8);
    trunkParts.push(mainTrunk);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const branch = createDetailedOrganicTrunk(height * 0.22, baseRadius * 0.28, baseRadius * 0.1, 4, 5, 0.2, 0);
      branch.rotateZ(0.55);
      branch.rotateY(angle);
      branch.translate(Math.cos(angle) * 0.25, height * 0.8, Math.sin(angle) * 0.25);
      trunkParts.push(branch);
    }

    const trunkGeometry = mergeBufferGeometries(trunkParts);

    const canopyClusters = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const leaf = new THREE.SphereGeometry(1.6, 5, 4, 0, Math.PI * 2, 0, Math.PI * 0.55);
      leaf.scale(1.6, 0.22, 1.6);
      leaf.rotateX(-0.45);
      leaf.rotateY(angle);
      leaf.translate(Math.cos(angle) * 2.4, height + 0.35, Math.sin(angle) * 2.4);
      canopyClusters.push(leaf);
    }
    const canopyGeometry = mergeBufferGeometries(canopyClusters);
    return { trunkGeometry, canopyGeometry };
  }

  /**
   * 5. Cacaueiro de sub-bosque — copa baixa densa e 2–4 frutos no tronco.
   */
  static createCacaueiroTree(height = 6.0, baseRadius = 0.42) {
    const trunkParts = [];
    const mainTrunk = createDetailedOrganicTrunk(height * 0.5, baseRadius, baseRadius * 0.5, 6, 6, 0.55, -0.7);
    trunkParts.push(mainTrunk);

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.3;
      const branch = createDetailedOrganicTrunk(height * 0.42, baseRadius * 0.38, baseRadius * 0.14, 4, 5, 0.4, 0);
      branch.rotateZ(0.7);
      branch.rotateY(angle);
      branch.translate(Math.cos(angle) * 0.2, height * 0.38, Math.sin(angle) * 0.2);
      trunkParts.push(branch);
    }

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.5;
      const pod = new THREE.SphereGeometry(0.16 + (i % 2) * 0.04, 6, 5);
      pod.scale(1, 1.35, 1);
      pod.translate(Math.cos(angle) * (baseRadius + 0.12), height * (0.22 + i * 0.08), Math.sin(angle) * (baseRadius + 0.12));
      trunkParts.push(pod);
    }

    const trunkGeometry = mergeBufferGeometries(trunkParts);

    const canopyClusters = [];
    const top = createVolumetricLeafCluster(3.2, 8, 5);
    top.scale(1.25, 0.55, 1.25);
    top.translate(0, height * 0.72, 0);
    canopyClusters.push(top);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const side = createVolumetricLeafCluster(2.2, 6, 4);
      side.scale(1.2, 0.5, 1.2);
      side.translate(Math.cos(angle) * 1.8, height * 0.55, Math.sin(angle) * 1.8);
      canopyClusters.push(side);
    }
    const canopyGeometry = mergeBufferGeometries(canopyClusters);
    return { trunkGeometry, canopyGeometry };
  }
}
