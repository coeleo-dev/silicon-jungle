/**
 * ProjectilePool — Pool de Geometrias, Materiais e Meshes de Projéteis
 * Elimina alocações por tiro: geometrias/materiais ficam cacheados (1 por tipo/cor)
 * e os meshes são reutilizados via free-list. Menos pressão no Garbage Collector.
 */
import { scene } from '../core/scene.js?v=20260821';

const geometryCache = new Map();
const materialCache = new Map();
const meshPool = [];

/**
 * Retorna (criando uma única vez) a geometria compartilhada de um tipo de projétil
 */
export function getProjectileGeometry(kind) {
  if (geometryCache.has(kind)) return geometryCache.get(kind);

  let geo;
  switch (kind) {
    case 'plasma':      geo = new THREE.CylinderGeometry(0.045, 0.045, 0.8, 6); break;
    case 'pellet':      geo = new THREE.SphereGeometry(0.08, 6, 6); break;
    case 'web':         geo = new THREE.SphereGeometry(0.35, 6, 6); break;
    case 'minion_laser': geo = new THREE.SphereGeometry(0.18, 6, 6); break;
    default:            geo = new THREE.SphereGeometry(0.12, 6, 6);
  }

  geometryCache.set(kind, geo);
  return geo;
}

/**
 * Retorna (criando uma única vez) o material de um projétil pela cor
 */
export function getProjectileMaterial(colorHex) {
  const key = colorHex >>> 0;
  if (materialCache.has(key)) return materialCache.get(key);
  const mat = new THREE.MeshBasicMaterial({ color: colorHex });
  materialCache.set(key, mat);
  return mat;
}

/**
 * Pega um mesh do pool (ou cria um novo). O mesh sai LIMPO: posição/rotação/escala zero.
 */
export function acquireProjectileMesh(geometry, material) {
  const mesh = meshPool.pop();
  if (mesh) {
    mesh.geometry = geometry;
    mesh.material = material;
    mesh.visible = true;
    mesh.position.set(0, 0, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);
    return mesh;
  }
  return new THREE.Mesh(geometry, material);
}

/**
 * Devolve um mesh ao pool (remove da cena e reutiliza depois)
 */
export function releaseProjectileMesh(mesh) {
  if (!mesh) return;
  scene.remove(mesh);
  mesh.visible = false;
  meshPool.push(mesh);
}

export function getProjectilePoolSize() {
  return meshPool.length;
}
