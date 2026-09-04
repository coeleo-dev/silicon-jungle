/**
 * Meshes toon PCB das peças de base. Usa THREE global (r128). Sem GLTF novo.
 */
const CYAN = 0x22d3ee;
const RED = 0xef4444;
const PCB = 0x0f766e;
const TRACE = 0x67e8f9;
const AMBER = 0xfbbf24;

function mat(color, opts = {}) {
  return new THREE.MeshLambertMaterial({
    color,
    transparent: !!opts.transparent,
    opacity: opts.opacity != null ? opts.opacity : 1,
    depthWrite: opts.depthWrite !== undefined ? opts.depthWrite : !opts.transparent
  });
}

function ghostMat(ok) {
  return mat(ok ? CYAN : RED, { transparent: true, opacity: 0.42, depthWrite: false });
}

export function createGhostMesh(type, ok) {
  const g = new THREE.Group();
  g.add(createPieceMesh(type || 'floor', { ghost: true, ok }));
  g.userData.buildGhost = true;
  return g;
}

export function tintGhost(group, ok) {
  if (!group) return;
  group.traverse((ch) => {
    if (ch.isMesh && ch.material) {
      ch.material.color.setHex(ok ? CYAN : RED);
      ch.material.opacity = 0.42;
    }
  });
}

export function createPieceMesh(type, opts = {}) {
  if (opts.ghost) {
    const m = primitive(type, ghostMat(opts.ok !== false), opts);
    m.userData.ghost = true;
    return m;
  }
  return primitive(type, mat(PCB), opts);
}

function primitive(type, material, opts = {}) {
  if (type === 'wall' || type === 'door') return wallLike(type, material, opts);
  if (type === 'stair') return stairMesh(material, opts);
  if (type === 'crate') return crateMesh(material);
  if (type === 'bench') return benchMesh(material);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), material);
  mesh.castShadow = !opts.ghost;
  mesh.receiveShadow = true;
  return mesh;
}

function wallLike(type, material, opts) {
  const g = new THREE.Group();
  const thick = type === 'door' ? 0.1 : 0.12;
  const h = 2.2;
  if (type === 'door') {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.82, h - 0.15, thick), material);
    panel.position.y = (h - 0.15) / 2;
    panel.position.x = 0.09;
    panel.name = 'doorPanel';
    g.add(panel);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, h, thick * 0.6), mat(TRACE));
    frame.position.y = h / 2;
    if (!opts.ghost) g.add(frame);
    else {
      panel.geometry = new THREE.BoxGeometry(1, h, thick);
      panel.position.x = 0;
    }
  } else {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, h, thick), material);
    mesh.position.y = h / 2;
    g.add(mesh);
  }
  g.userData.pieceType = type;
  return g;
}

function stairMesh(material, opts) {
  const g = new THREE.Group();
  const steps = 6;
  for (let i = 0; i < steps; i++) {
    const y = 0.12 + i * (2.2 / steps);
    const z = (i + 0.5) / steps;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.22), material);
    box.position.set(0, y, z);
    box.castShadow = !opts.ghost;
    g.add(box);
  }
  return g;
}

function crateMesh(material) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.72), material);
  box.position.y = 0.36;
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.08, 0.74), mat(AMBER));
  lid.position.y = 0.7;
  g.add(box);
  g.add(lid);
  return g;
}

function benchMesh(material) {
  const g = new THREE.Group();
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.55), material);
  top.position.y = 0.85;
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), mat(TRACE));
  const l1 = leg.clone();
  l1.position.set(-0.45, 0.42, -0.18);
  const l2 = leg.clone();
  l2.position.set(0.45, 0.42, -0.18);
  const l3 = leg.clone();
  l3.position.set(-0.45, 0.42, 0.18);
  const l4 = leg.clone();
  l4.position.set(0.45, 0.42, 0.18);
  const holo = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), mat(CYAN));
  holo.position.y = 1.05;
  g.add(top, l1, l2, l3, l4, holo);
  return g;
}

export function positionWallGroup(group, rec) {
  if (rec.edge === 'E') {
    group.position.set(rec.ix + 0.5, rec.y, rec.iz);
    group.rotation.y = Math.PI / 2;
  } else {
    group.position.set(rec.ix, rec.y, rec.iz + 0.5);
    group.rotation.y = 0;
  }
}

export function applyDoorOpen(group, open) {
  if (!group) return;
  const panel = group.getObjectByName('doorPanel');
  if (!panel) return;
  panel.rotation.y = open ? Math.PI / 2 : 0;
  panel.position.x = open ? 0.5 : 0.09;
}
