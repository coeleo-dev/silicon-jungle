/**
 * NeonSignFactory.js — Fábrica de Letreiros Neon, Painéis de Propaganda e Pseudologomarcas
 * Cria letreiros 3D autoiluminados com molduras de ferro e tipografias geométricas cyberpunk.
 */
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { mergeBufferGeometries } from '../vegetation/TreeFactory.js?v=20260821';

export class NeonSignFactory {
  /**
   * Cria um letreiro de fachada comercial com moldura de ferro e tubos neon
   * @param {string} type 'hardware' | 'cybermart' | 'optics' | 'cooling' | 'warning'
   * @param {number} width Largura do letreiro
   * @param {number} height Altura do letreiro
   */
  static createSign(type = 'hardware', width = 6.0, height = 1.8) {
    const ironGeos = [];
    const neonGeos = [];
    const group = new THREE.Group();

    // 1. Moldura e Placa de Suporte Metálica
    const backplate = new THREE.BoxGeometry(width, height, 0.25);
    ironGeos.push(backplate);

    // Suportes de fixação
    [-width / 2 + 0.5, width / 2 - 0.5].forEach(x => {
      const rod = new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6);
      rod.rotateX(Math.PI / 2);
      rod.translate(x, 0, -0.45);
      ironGeos.push(rod);
    });

    let neonMat = TOON_MATERIALS.NEON_CYAN;

    if (type === 'hardware') {
      neonMat = TOON_MATERIALS.NEON_CYAN;
      // Barras neon superior e inferior
      const barTop = new THREE.BoxGeometry(width * 0.9, 0.1, 0.08);
      barTop.translate(0, height * 0.35, 0.16);
      neonGeos.push(barTop);

      const barBot = new THREE.BoxGeometry(width * 0.9, 0.1, 0.08);
      barBot.translate(0, -height * 0.35, 0.16);
      neonGeos.push(barBot);

      // Glifos geométricos centrais (NEO SILICON)
      for (let i = -3; i <= 3; i++) {
        const seg = new THREE.BoxGeometry(0.35, 0.65, 0.08);
        seg.translate(i * 0.7, 0, 0.16);
        neonGeos.push(seg);
      }
    } else if (type === 'cybermart') {
      neonMat = TOON_MATERIALS.NEON_GREEN;
      const barTop = new THREE.BoxGeometry(width * 0.85, 0.12, 0.08);
      barTop.translate(0, height * 0.32, 0.16);
      neonGeos.push(barTop);

      // Losango e barras
      for (let i = -2; i <= 2; i++) {
        const seg = new THREE.BoxGeometry(0.4, 0.5, 0.08);
        seg.translate(i * 0.9, 0, 0.16);
        neonGeos.push(seg);
      }
    } else if (type === 'optics' || type === 'cooling') {
      neonMat = TOON_MATERIALS.NEON_MAGENTA;
      // Anel circular neon de logotipo
      const ring = new THREE.TorusGeometry(0.55, 0.06, 6, 12);
      ring.translate(-width * 0.3, 0, 0.16);
      neonGeos.push(ring);

      const bar = new THREE.BoxGeometry(width * 0.45, 0.14, 0.08);
      bar.translate(width * 0.15, 0, 0.16);
      neonGeos.push(bar);
    } else if (type === 'warning') {
      neonMat = TOON_MATERIALS.NEON_AMBER;
      // Triângulo de advertência
      const bar1 = new THREE.BoxGeometry(width * 0.8, 0.14, 0.08);
      bar1.translate(0, 0, 0.16);
      neonGeos.push(bar1);
    }

    const mergedIron = mergeBufferGeometries(ironGeos);
    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    ironMesh.castShadow = true;
    group.add(ironMesh);

    if (neonGeos.length > 0) {
      const mergedNeon = mergeBufferGeometries(neonGeos);
      const neonMesh = new THREE.Mesh(mergedNeon, neonMat);
      group.add(neonMesh);
    }

    return group;
  }

  /**
   * Cria um grande outdoor de propaganda para o topo de arranha-céus
   */
  static createRooftopBillboard(width = 12.0, height = 5.0) {
    const ironGeos = [];
    const neonGeos = [];
    const group = new THREE.Group();

    // Treliça metálica traseira
    for (let x = -width / 2 + 1; x <= width / 2 - 1; x += 3.0) {
      const leg = new THREE.BoxGeometry(0.3, height + 2.0, 0.3);
      leg.translate(x, (height + 2.0) / 2, 0);
      ironGeos.push(leg);

      const diag = new THREE.BoxGeometry(0.2, height * 1.2, 0.2);
      diag.rotateZ(0.4);
      diag.translate(x + 1.0, height / 2 + 1.0, 0);
      ironGeos.push(diag);
    }

    // Painel frontal
    const board = new THREE.BoxGeometry(width, height, 0.3);
    board.translate(0, height / 2 + 1.5, 0.3);
    ironGeos.push(board);

    // Letreiro neon gigante
    const neonBorder = new THREE.BoxGeometry(width * 0.94, height * 0.88, 0.1);
    neonBorder.translate(0, height / 2 + 1.5, 0.48);
    neonGeos.push(neonBorder);

    const mergedIron = mergeBufferGeometries(ironGeos);
    const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
    group.add(ironMesh);

    const mergedNeon = mergeBufferGeometries(neonGeos);
    const neonMesh = new THREE.Mesh(mergedNeon, TOON_MATERIALS.NEON_CYAN);
    group.add(neonMesh);

    return group;
  }
}
