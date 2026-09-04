/**
 * outline.js — Outline Cel-Shaded (Inverted Hull)
 * Contornos de tinta para o look anime definitivo: um clone da geometria,
 * levemente inflado, preto e renderizado por trás (BackSide), preso como
 * filho do mesh original. Determinístico e barato (sem pós-processamento).
 */

/**
 * Adiciona um contorno (hull) a um único mesh opaco.
 * @param {THREE.Mesh} mesh       mesh de origem (não instanciado)
 * @param {number} thickness      espessura relativa (0.03 = 3%)
 * @param {number} minRadius      ignora meshes com raio menor (evita ruído em props minúsculos)
 * @returns {THREE.Mesh|null}
 */
export function addToonOutline(mesh, thickness = 0.03, minRadius = 0) {
  if (!mesh || !mesh.isMesh || mesh.isInstancedMesh || !mesh.geometry) return null;
  if (mesh.userData && mesh.userData.toonOutline) return null; // idempotente

  const mat = mesh.material;
  if (!mat) return null;
  if (mat.transparent || mat.isMeshBasicMaterial) return null; // vidro / neons / emissivos
  if (mat.opacity !== undefined && mat.opacity < 1) return null;

  const geo = mesh.geometry;
  if (!geo.boundingBox) geo.computeBoundingBox();
  if (!geo.boundingBox) return null; // geometria degenerada

  if (minRadius > 0) {
    if (!geo.boundingSphere) geo.computeBoundingSphere();
    if (!geo.boundingSphere || geo.boundingSphere.radius < minRadius) return null;
  }

  const hullGeo = geo.clone();
  hullGeo.computeBoundingBox();
  const center = hullGeo.boundingBox.getCenter(new THREE.Vector3());
  hullGeo.translate(-center.x, -center.y, -center.z);

  const hull = new THREE.Mesh(hullGeo, new THREE.MeshBasicMaterial({
    color: 0x05070c,
    side: THREE.BackSide,
    depthWrite: true
  }));
  hull.scale.setScalar(1 + thickness);
  hull.position.copy(center);
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.renderOrder = -1;
  hull.raycast = () => {}; // nunca intercepta raycasts de interação/dano

  mesh.add(hull);
  mesh.userData.toonOutline = true;
  return hull;
}

/**
 * Aplica outlines a todos os meshes opacos de um grupo, de forma centralizada.
 * @param {THREE.Object3D} group
 * @param {number} thickness
 * @param {number} minRadius
 * @returns {number} quantidade de hulls criados
 */
export function applyToonOutlines(group, thickness = 0.03, minRadius = 0) {
  if (!group) return 0;
  let count = 0;
  group.traverse((obj) => {
    if (obj.isMesh && !obj.isInstancedMesh && addToonOutline(obj, thickness, minRadius)) {
      count++;
    }
  });
  return count;
}

/**
 * Outlines só em malhas específicas (torso/cabeça) — evita hull duplicado em pernas.
 * @param {THREE.Mesh|THREE.Mesh[]} meshes
 */
export function applyToonOutlinesToMeshes(meshes, thickness = 0.03) {
  const list = Array.isArray(meshes) ? meshes : [meshes];
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    if (addToonOutline(list[i], thickness, 0)) count++;
  }
  return count;
}
