/**
 * InteriorPropsFactory.js — Fábrica de Mobília e Adereços Interiores de Ruínas
 * Posiciona servidores, mesas, caixas e armários encostados nas paredes perimetrais,
 * garantindo corredor central 100% desobstruído da porta até o fundo da sala.
 */
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { mergeBufferGeometries } from '../vegetation/TreeFactory.js?v=20260821';

export class InteriorPropsFactory {
  /**
   * Gera um conjunto completo de mobília e tecnologia interior
   */
  static createOfficeLobbyProps(width = 16, depth = 16) {
    const ironGeos = [];
    const concreteGeos = [];

    // 1. Racks de Servidores com Painéis (Encostados na parede de fundo Norte)
    for (let rx = -width / 2 + 3.0; rx <= width / 2 - 3.0; rx += 3.2) {
      if (Math.abs(rx) < 1.8) continue; // Abre passagem no meio
      const rackGeo = new THREE.BoxGeometry(1.6, 3.8, 1.4);
      rackGeo.translate(rx, 1.9, -depth / 2 + 1.6);
      ironGeos.push(rackGeo);
    }

    // 2. Mesas de Trabalho e Bancadas Laterais (Encostadas nas paredes Oeste e Leste)
    const deskLeft = new THREE.BoxGeometry(1.4, 0.9, 3.8);
    deskLeft.translate(-width / 2 + 1.8, 0.45, 0);
    ironGeos.push(deskLeft);

    const monitorLeft = new THREE.BoxGeometry(0.5, 0.65, 0.8);
    monitorLeft.translate(-width / 2 + 1.8, 1.25, 0);
    ironGeos.push(monitorLeft);

    const deskRight = new THREE.BoxGeometry(1.4, 0.9, 3.8);
    deskRight.translate(width / 2 - 1.8, 0.45, 0);
    ironGeos.push(deskRight);

    const monitorRight = new THREE.BoxGeometry(0.5, 0.65, 0.8);
    monitorRight.translate(width / 2 - 1.8, 1.25, 0);
    ironGeos.push(monitorRight);

    // 3. Caixas de Carga nos Cantos Traseiros
    const crate1 = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    crate1.translate(-width / 2 + 2.0, 0.8, -depth / 2 + 3.5);
    ironGeos.push(crate1);

    const crate2 = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    crate2.translate(width / 2 - 2.0, 0.65, -depth / 2 + 3.5);
    ironGeos.push(crate2);

    // 4. Armários Metálicos de Arquivo (Laterais)
    const locker = new THREE.BoxGeometry(1.2, 2.6, 2.8);
    locker.translate(width / 2 - 1.8, 1.3, -depth / 2 + 6.5);
    ironGeos.push(locker);

    // 5. Entulho de Concreto Quebrado no Canto
    const rubble1 = new THREE.DodecahedronGeometry(1.0, 0);
    rubble1.scale(1.2, 0.35, 1.2);
    rubble1.translate(-width / 2 + 2.2, 0.2, depth / 2 - 2.5);
    concreteGeos.push(rubble1);

    const mergedIron = mergeBufferGeometries(ironGeos);
    const mergedConcrete = mergeBufferGeometries(concreteGeos);

    const propsGroup = new THREE.Group();
    if (mergedIron) {
      const ironMesh = new THREE.Mesh(mergedIron, TOON_MATERIALS.RUST_WRECK);
      ironMesh.receiveShadow = true;
      propsGroup.add(ironMesh);
    }

    if (mergedConcrete) {
      const concreteMesh = new THREE.Mesh(mergedConcrete, TOON_MATERIALS.CONCRETE_BUNKER);
      concreteMesh.receiveShadow = true;
      propsGroup.add(concreteMesh);
    }

    return propsGroup;
  }

  /**
   * Caixas de cobertura no teto (mesmo vocabulário das caixas do lobby).
   * Altura 1.6m: o player se esconde atrás; não é auto-step.
   */
  static appendRooftopCover(ironGeos, wallColliders, x, baseY, z) {
    const crate = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    crate.translate(x, baseY + 0.8, z);
    ironGeos.push(crate);
    wallColliders.push({
      minX: x - 0.8,
      maxX: x + 0.8,
      minZ: z - 0.8,
      maxZ: z + 0.8,
      minY: baseY,
      maxY: baseY + 1.6
    });

    const crate2 = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    crate2.translate(x + 1.45, baseY + 0.65, z);
    ironGeos.push(crate2);
    wallColliders.push({
      minX: x + 1.45 - 0.65,
      maxX: x + 1.45 + 0.65,
      minZ: z - 0.65,
      maxZ: z + 0.65,
      minY: baseY,
      maxY: baseY + 1.3
    });
  }
}
