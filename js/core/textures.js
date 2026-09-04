/**
 * Gerenciador Central de Materiais Toon (Cel-Shaded) — Identidade Visual Aprovada
 * Unifica todos os materiais em MeshToonMaterial com gradientMap.
 * Mantém apenas o mapa de cor (+ Opacity para folhagem com cutout);
 * normal/roughness/metalness (PBR) foram descartados por decisão de estilo.
 */

import { toonGradient } from './scene.js?v=20260821';

const loader = new THREE.TextureLoader();
const textureCache = new Map();
const materialCache = new Map();

/**
 * Carrega uma textura com caching e parâmetros de repetição UV
 */
export function loadTexture(path, repeatU = 1, repeatV = 1) {
  const cacheKey = `${path}_${repeatU}_${repeatV}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const tex = loader.load(path);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatU, repeatV);
  tex.anisotropy = 8;

  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Gera (uma única vez, cacheada) um alpha map procedural de folhagem.
 * Os conjuntos AmbientCG de folhagem não possuem mapa de Opacidade em assets/
 * (a limpeza de Fase 1 manteve só os arquivos carregáveis); sem alpha map, cada
 * quad de folha renderiza como retângulo sólido. Este padrão mottled com buracos
 * restaura o recorte de folhagem sem depender de arquivo externo.
 */
let foliageAlphaTexture = null;
function getFoliageAlphaTexture() {
  if (foliageAlphaTexture) return foliageAlphaTexture;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Blobs radiais brancos (opacos) com transparência variada + buracos entre eles
  const blobCount = 90;
  for (let i = 0; i < blobCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 18 + Math.random() * 34;
    const a = 0.55 + Math.random() * 0.45;
    const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.7, `rgba(255,255,255,${a * 0.85})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  foliageAlphaTexture = tex;
  return tex;
}

/**
 * Cria um conjunto de materiais toon (Color + Opacity opcional)
 */
export function createToonMaterialSet(baseFolder, baseName, repeatU = 1, repeatV = 1, options = {}) {
  const cacheKey = `${baseFolder}_${baseName}_${repeatU}_${repeatV}_${JSON.stringify(options)}`;
  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey);
  }

  const colorMap = loadTexture(`assets/textures/${baseFolder}/${baseName}_1K-JPG_Color.jpg`, repeatU, repeatV);

  let alphaMap = null;
  if (options.hasAlpha) {
    alphaMap = getFoliageAlphaTexture();
  }

  const mat = new THREE.MeshToonMaterial({
    map: colorMap,
    gradientMap: toonGradient,
    color: options.tint !== undefined ? options.tint : 0xffffff,
    side: options.side !== undefined ? options.side : (options.hasAlpha || options.transparent ? THREE.DoubleSide : THREE.FrontSide),
    transparent: options.transparent || false,
    opacity: options.opacity !== undefined ? options.opacity : 1.0,
    alphaMap: alphaMap,
    alphaTest: options.alphaTest !== undefined ? options.alphaTest : (options.hasAlpha ? 0.35 : 0.0),
    depthWrite: options.depthWrite !== undefined ? options.depthWrite : true,
    shadowSide: (options.hasAlpha || options.transparent) ? THREE.DoubleSide : THREE.FrontSide
  });

  materialCache.set(cacheKey, mat);
  return mat;
}

/**
 * Cria um material toon direto a partir de um mapa de cor (fotografia estilizada)
 */
export function createDirectToonMaterial(diffPath, options = {}) {
  const colorMap = loadTexture(diffPath, options.repeatU || 1, options.repeatV || 1);

  return new THREE.MeshToonMaterial({
    map: colorMap,
    gradientMap: toonGradient,
    side: options.side || (options.transparent ? THREE.DoubleSide : THREE.FrontSide),
    transparent: options.transparent || false,
    alphaTest: options.alphaTest !== undefined ? options.alphaTest : (options.transparent ? 0.4 : 0.0),
    depthWrite: true
  });
}

function createCanvasTexture(draw, size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function drawAsphaltCanvas(ctx, size) {
  ctx.fillStyle = '#1c1c24';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 140; i++) {
    const g = 22 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${g},${g},${g + 6})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 2 + Math.random() * 6, 1 + Math.random() * 3);
  }
  ctx.strokeStyle = 'rgba(210, 200, 140, 0.22)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size * 0.48, 0);
  ctx.lineTo(size * 0.52, size);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.quadraticCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
}

function drawSidewalkCanvas(ctx, size) {
  ctx.fillStyle = '#5c6974';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 180; i++) {
    const g = 70 + Math.floor(Math.random() * 36);
    ctx.fillStyle = `rgba(${g},${g + 6},${g + 12},${0.25 + Math.random() * 0.35})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 4 + Math.random() * 16, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(28, 34, 40, 0.4)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.quadraticCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
}

function createCanvasToonMaterial(drawFn, repeatU, repeatV, tint) {
  const map = createCanvasTexture(drawFn, 256);
  map.repeat.set(repeatU, repeatV);
  return new THREE.MeshToonMaterial({
    map,
    color: tint,
    gradientMap: toonGradient
  });
}

// ==========================================================
// TOON_MATERIALS — Paleta Cel-Shaded Bioluminescente
// ==========================================================

export const TOON_MATERIALS = {
  // 1. Tronco de Palmeira (Casca anelada em tom âmbar amadeirado)
  BARK_PALM: createToonMaterialSet('Bark014', 'Bark014', 1, 1, {
    tint: 0x9a6b47
  }),

  // 2. Figueira Banyan / Sumaúma (Casca de madeira nobre)
  BARK_BANYAN: createToonMaterialSet('Bark007', 'Bark007', 1, 1, {
    tint: 0x7c4f2e
  }),

  // 3. Pinheiro de Alta Voltagem e Troncos Retorcidos
  BARK_TWISTED: createToonMaterialSet('Bark001', 'Bark001', 1, 1, {
    tint: 0x6e4023
  }),

  // 4. Folhagem Verde Esmeralda (Palmeiras Imperiais)
  FOLIAGE_PALM: createToonMaterialSet('Foliage002', 'Foliage002', 1, 1, {
    tint: 0xa7f3d0,
    hasAlpha: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide
  }),

  // 5. Folhagem Densa de Samambaias e Arbustos Tropicais
  FOLIAGE_FERN_DENSE: createToonMaterialSet('Foliage001', 'Foliage001', 1, 1, {
    tint: 0x86efac,
    hasAlpha: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide
  }),

  // 6. Copas Volumétricas do Banyan e Sumaúma
  FOLIAGE_DEEP_JUNGLE: createToonMaterialSet('Foliage002', 'Foliage002', 1, 1, {
    tint: 0x4ade80,
    hasAlpha: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide
  }),

  // 7. Folhagem Iluminada / Embaúba
  FOLIAGE_OLIVE: createToonMaterialSet('Foliage002', 'Foliage002', 1, 1, {
    tint: 0xbbf7d0,
    hasAlpha: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide
  }),

  // 8. Folhagem de Pinheiro
  FOLIAGE_DARK_EVERGREEN: createToonMaterialSet('Foliage001', 'Foliage001', 1, 1, {
    tint: 0x22c55e,
    hasAlpha: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide
  }),

  // 9. Folhagem Ciano / Gramíneas de Planície
  FOLIAGE_TEAL: createToonMaterialSet('Foliage002', 'Foliage002', 1, 1, {
    tint: 0x5eead4,
    hasAlpha: true,
    alphaTest: 0.35,
    side: THREE.DoubleSide
  }),

  // 10. Solo de Silício e Terra da Selva (Fosco e Natural)
  GROUND_JUNGLE: createToonMaterialSet('Ground037', 'Ground037', 16, 16, {}),

  // 11. Trilhas de Terra Batida e Encostas
  GROUND_TRAILS: createToonMaterialSet('Ground048', 'Ground048', 12, 12, {}),

  // 12. Penhascos de Silício Negro e Cânions
  ROCK_DARK_CLIFF: createToonMaterialSet('Rock035', 'Rock035', 8, 8, {}),

  // 13. Paredões de Montanha
  ROCK_MOUNTAIN: createToonMaterialSet('Rock020', 'Rock020', 6, 6, {}),

  // 14. Asfalto Tecnológico / Cerâmica das Avenidas
  // Tiles074 é xadrez de cerâmica — não usar no terreno (lotes ficam quadriculados)
  TILES_PCB_STREET: createToonMaterialSet('Tiles074', 'Tiles074', 24, 24, {}),

  // 15. Musgo Aveludado
  MOSS_VELVET: createToonMaterialSet('Moss001', 'Moss001', 8, 8, {}),

  // 16. Musgo Bioluminescente de Cura
  MOSS_OVERGROWTH: createToonMaterialSet('Moss002', 'Moss002', 3, 3, {
    tint: 0x6ee7b7,
    side: THREE.DoubleSide
  }),

  // 17. Aço Industrial (metálico virou toon com mapa de cor)
  METAL_BRUSHED_STEEL: createToonMaterialSet('Metal032', 'Metal032', 2, 2, {}),

  // 18. Placas de Blindagem com Rebites
  METAL_PLATES_IO: createToonMaterialSet('MetalPlates001', 'MetalPlates001', 3, 3, {}),

  // 19. Painéis Industriais
  METAL_PLATES_RAM: createToonMaterialSet('MetalPlates004', 'MetalPlates004', 2, 5, {}),

  // 20. Pintura Metálica Descascada
  PAINTED_METAL: createToonMaterialSet('PaintedMetal004', 'PaintedMetal004', 2, 2, {}),

  // 21. Concreto de Bunkers
  CONCRETE_BUNKER: createToonMaterialSet('Concrete019', 'Concrete019', 4, 4, {}),

  // 22. Pisos Metálicos Antiderrapantes
  DIAMOND_PLATE_FLOOR: createToonMaterialSet('DiamondPlate001', 'DiamondPlate001', 6, 6, {}),

  // 23. Metal Enferrujado de Sucatas
  RUST_WRECK: createToonMaterialSet('Rust001', 'Rust001', 2, 2, {}),

  // 24. Fotografias da Floresta (Poly Haven) convertidas para toon — só o mapa de cor
  REALISTIC_JACARANDA_TRUNK: createDirectToonMaterial(
    'assets/models/nature/jacaranda_tree/textures/jacaranda_tree_trunk_diff_1k.jpg',
    { repeatU: 1, repeatV: 3 }
  ),

  REALISTIC_JACARANDA_LEAVES: createDirectToonMaterial(
    'assets/models/nature/jacaranda_tree/textures/jacaranda_tree_leaves_diff_1k.png',
    { transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }
  ),

  REALISTIC_ISLAND_TRUNK: createDirectToonMaterial(
    'assets/models/nature/island_tree_02/textures/island_tree_02_diff_1k.jpg',
    { repeatU: 1, repeatV: 2 }
  ),

  REALISTIC_ISLAND_LEAVES: createDirectToonMaterial(
    'assets/models/nature/island_tree_02/textures/island_tree_02_leaves_diff_1k.png',
    { transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }
  ),

  REALISTIC_ROOTS: createDirectToonMaterial(
    'assets/models/nature/pine_roots/textures/pine_roots_a_diff_1k.jpg',
    {}
  ),

  REALISTIC_FERN: createDirectToonMaterial(
    'assets/models/nature/fern_02/textures/fern_02_diff_1k.jpg',
    { transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }
  ),

  REALISTIC_ANTHURIUM: createDirectToonMaterial(
    'assets/models/nature/anthurium_botany_01/textures/anthurium_botany_01_diff_1k.jpg',
    { transparent: true, alphaTest: 0.45, side: THREE.DoubleSide }
  ),

  // 25. Vidro Quebrado e Translúcido de Janelas e Vitrines
  SHATTERED_GLASS: new THREE.MeshToonMaterial({
    color: 0x88d5ff,
    gradientMap: toonGradient,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false
  }),

  // 26. Painéis Luminosos e Letreiros Neon Emissivos (inalterados — melhor ativo visual)
  NEON_CYAN: new THREE.MeshBasicMaterial({ color: 0x00f0ff }),
  NEON_AMBER: new THREE.MeshBasicMaterial({ color: 0xffb700 }),
  NEON_MAGENTA: new THREE.MeshBasicMaterial({ color: 0xff007f }),
  NEON_GREEN: new THREE.MeshBasicMaterial({ color: 0x00ffaa }),
  NEON_WHITE: new THREE.MeshBasicMaterial({ color: 0xe0f2fe }),

  // 27. Grades e Cercas Metálicas de Becos
  FENCE_CHAINLINK: new THREE.MeshToonMaterial({
    color: 0x64748b,
    gradientMap: toonGradient,
    wireframe: true
  }),

  // 28. Paletas Arquitetônicas Temáticas por Distrito (leve elevação de saturação para o look vibrante)
  OBSIDIAN_CONCRETE: new THREE.MeshToonMaterial({
    color: 0x1e222d,
    gradientMap: toonGradient
  }),

  TERRACOTTA_CONCRETE: new THREE.MeshToonMaterial({
    color: 0x7a2d1f,
    gradientMap: toonGradient
  }),

  CYAN_PANEL_METAL: new THREE.MeshToonMaterial({
    color: 0x1383a3,
    gradientMap: toonGradient
  }),

  AMBER_PANEL_METAL: new THREE.MeshToonMaterial({
    color: 0xc2620f,
    gradientMap: toonGradient
  }),

  // 29. Materiais dedicados de armas (não reutilizar piso/concreto)
  WEAPON_POLYMER: new THREE.MeshToonMaterial({
    color: 0x3d4454,
    gradientMap: toonGradient
  }),
  WEAPON_STEEL: new THREE.MeshToonMaterial({
    color: 0x9aa7b5,
    gradientMap: toonGradient
  }),
  WEAPON_NEON: new THREE.MeshToonMaterial({
    color: 0x22d3ee,
    gradientMap: toonGradient
  }),

  // 30. Pavimento Asfáltico Urbano Estilo Tokyo & Calçadas Elevadas
  DARK_ASPHALT_ROAD: createCanvasToonMaterial(drawAsphaltCanvas, 8, 8, 0x2a2a32),
  SIDEWALK_PAVEMENT: createCanvasToonMaterial(drawSidewalkCanvas, 6, 6, 0x6b7c8d),

  // 31. Trepadeiras e Lianas Penduradas nos Prédios
  HANGING_VINES: new THREE.MeshToonMaterial({
    color: 0x1a7a3c,
    gradientMap: toonGradient,
    side: THREE.DoubleSide
  })
};
