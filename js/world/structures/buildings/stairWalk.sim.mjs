/**
 * Simula o player andando nas escadas (sobe, vira no U, desce).
 * Espelha auto-step de caixa + faixa dos pés de collision.js.
 * Rode: node js/world/structures/buildings/stairWalk.sim.mjs
 */
import { fireEscapeLayout, STEP_THICK } from './stairLayout.js';
import { isBoxTopWalkable } from '../../../utils/floorBand.js';

const EYE = 1.8;
const RADIUS = 0.45;

function rotateAABB(local, rot) {
  const cosR = Math.cos(rot);
  const sinR = -Math.sin(rot);
  const corners = [
    [local.minX, local.minZ],
    [local.minX, local.maxZ],
    [local.maxX, local.minZ],
    [local.maxX, local.maxZ]
  ].map(([x, z]) => [x * cosR - z * sinR, x * sinR + z * cosR]);
  const xs = corners.map(c => c[0]);
  const zs = corners.map(c => c[1]);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minZ: Math.min(...zs), maxZ: Math.max(...zs),
    minY: local.minY, maxY: local.maxY
  };
}

function buildBoxes(layout, rot = 0) {
  const boxes = [];
  const push = (local) => boxes.push(rotateAABB(local, rot));

  for (const pad of layout.landings) {
    push({
      minX: pad.minX, maxX: pad.maxX,
      minZ: pad.minZ, maxZ: pad.maxZ,
      minY: pad.y, maxY: pad.y + STEP_THICK
    });
    if (pad.hasBackWall) {
      push({
        minX: pad.minX, maxX: pad.maxX,
        minZ: pad.outerZ - 0.15, maxZ: pad.outerZ + 0.15,
        minY: pad.y, maxY: pad.y + 1.2
      });
    }
  }
  for (const flight of layout.flights) {
    for (const step of flight.steps) {
      push({
        minX: step.minX, maxX: step.maxX,
        minZ: step.minZ, maxZ: step.maxZ,
        minY: step.y, maxY: step.y + STEP_THICK
      });
    }
  }
  return boxes;
}

function sampleFloor(boxes, x, z, cameraY) {
  const footY = cameraY - EYE;
  let floorH = EYE; // terreno y=0
  for (const b of boxes) {
    if (x < b.minX - RADIUS || x > b.maxX + RADIUS || z < b.minZ - RADIUS || z > b.maxZ + RADIUS) continue;
    const stepDelta = b.maxY - footY;
    if (stepDelta >= -0.2 && stepDelta <= 0.50 && cameraY >= b.minY - 0.6) {
      if (b.maxY + EYE > floorH) floorH = b.maxY + EYE;
      continue;
    }
    if (cameraY >= b.maxY + EYE - 0.45 && isBoxTopWalkable(b.maxY, footY)) {
      if (b.maxY + EYE > floorH) floorH = b.maxY + EYE;
    }
  }
  return floorH;
}

function walk(boxes, waypoints, label) {
  let x = waypoints[0].x;
  let z = waypoints[0].z;
  let camY = waypoints[0].y + EYE;
  const step = 0.12;

  let maxFoot = 0;
  for (let w = 1; w < waypoints.length; w++) {
    const t = waypoints[w];
    for (let i = 0; i < 800; i++) {
      const dx = t.x - x;
      const dz = t.z - z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.2) break;
      x += (dx / dist) * step;
      z += (dz / dist) * step;
      const floorH = sampleFloor(boxes, x, z, camY);
      const delta = floorH - camY;
      if (delta > 0 && delta <= 0.85) {
        camY = floorH;
      } else if (camY > floorH) {
        camY = Math.max(floorH, camY - 0.4);
      }
      maxFoot = Math.max(maxFoot, camY - EYE);
      if (i === 799) {
        throw new Error(`${label}: timeout indo a wp ${w} (${t.x.toFixed(1)}, ${t.z.toFixed(1)}) camY=${camY.toFixed(2)}`);
      }
    }
    const floorH = sampleFloor(boxes, x, z, camY);
    if (camY > floorH) camY = floorH;
    const foot = camY - EYE;
    maxFoot = Math.max(maxFoot, foot);
    if (t.expectY != null && Math.abs(foot - t.expectY) > 0.7) {
      throw new Error(`${label}: wp ${w} pé=${foot.toFixed(2)} esperado ~${t.expectY.toFixed(2)}`);
    }
  }
  return { foot: camY - EYE, maxFoot };
}

function rotatePoint(x, z, rot) {
  const cosR = Math.cos(rot);
  const sinR = -Math.sin(rot);
  return { x: x * cosR - z * sinR, z: x * sinR + z * cosR };
}

function makeWaypoints(layout, rot) {
  const { landings, flights } = layout;
  const wp = [];
  const add = (lx, lz, expectY) => {
    const p = rotatePoint(lx, lz, rot);
    wp.push({ x: p.x, z: p.z, y: expectY, expectY });
  };

  // Sobe: nos extremos do lance o lábio do patamar é o chão (0.35m acima do último degrau)
  add(flights[0].cx, landings[0].meetZ + landings[0].dirZ * 2.0, landings[0].y + STEP_THICK);
  for (let f = 0; f < flights.length; f++) {
    const steps = flights[f].steps;
    for (let s = 0; s < steps.length; s++) {
      const step = steps[s];
      const onPad = s === 0 || s === steps.length - 1;
      const expect = onPad
        ? (s === 0 ? landings[f].y + STEP_THICK : landings[f + 1].y + STEP_THICK)
        : step.y + STEP_THICK;
      add(step.x, step.z, expect);
    }
    const pad = landings[f + 1];
    const turnX = (flights[f].cx + (flights[f + 1] ? flights[f + 1].cx : flights[f].cx)) / 2;
    const turnZ = pad.meetZ + pad.dirZ * 2.0;
    add(turnX, turnZ, pad.y + STEP_THICK);
  }

  const upCount = wp.length;

  // Desce (reverso, sem duplicar o topo)
  for (let i = upCount - 2; i >= 0; i--) {
    wp.push({ ...wp[i] });
  }
  return wp;
}

function runCase(name, spec, rot) {
  const layout = fireEscapeLayout(spec);
  const boxes = buildBoxes(layout, rot);
  const wps = makeWaypoints(layout, rot);
  const result = walk(boxes, wps, name);
  const roofY = spec.height + STEP_THICK;
  if (result.maxFoot < roofY - 0.8) {
    throw new Error(`${name}: não chegou ao topo (max pé=${result.maxFoot.toFixed(2)}, teto~${roofY.toFixed(2)})`);
  }
  if (result.foot > 1.2) {
    throw new Error(`${name}: desceu mas pé ficou em ${result.foot.toFixed(2)} (deveria estar no chão)`);
  }
  console.log(`ok: ${name}  lances=${layout.numFlights}  wps=${wps.length}  topo=${result.maxFoot.toFixed(2)}  pé final=${result.foot.toFixed(2)}`);
}

try {
  runCase('workshop h=10 rot0', { width: 16, depth: 16, height: 10 }, 0);
  runCase('workshop h=10 rot90', { width: 16, depth: 16, height: 10 }, Math.PI / 2);
  runCase('tower h=42 rot0', { width: 20, depth: 20, height: 42 }, 0);
  runCase('tower h=42 rot-90', { width: 20, depth: 20, height: 42 }, -Math.PI / 2);
  console.log('\nstairWalk sim passed');
} catch (e) {
  console.error('FAIL:', e.message);
  process.exit(1);
}
