/**
 * Fase A restante: fundação com vão, doorway, degraus do IOComplex.
 * Rode: node js/world/structures/buildings/buildingColliders.test.mjs
 */
import {
  foundationColliders,
  doorwayVolume,
  isInsideDoorway,
  shouldSkipWallInDoorway,
  ioComplexStepBoxes,
  worldAabbFromLocal,
  FOUNDATION_DEPTH
} from './buildingColliders.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

function coversPoint(boxes, x, y, z) {
  return boxes.some(b =>
    x >= b.minX && x <= b.maxX &&
    y >= b.minY && y <= b.maxY &&
    z >= b.minZ && z <= b.maxZ
  );
}

const width = 16;
const depth = 16;
const doorW = 5.0;
const doorH = 4.0;

const found = foundationColliders({ width, depth, doorW });
assert(FOUNDATION_DEPTH === 7.5, 'fundação visual tem 7.5m');
assert(
  found.every(b => b.minY === -7.5 || b.maxY <= 0.25),
  'fundação vai até -7.5m (ou plinto baixo na entrada)'
);
assert(
  coversPoint(found, 0, -1, -depth / 2),
  'face norte da fundação é sólida'
);
assert(
  coversPoint(found, width / 2 + 0.2, -1, 0),
  'face leste da fundação cobre o pad de 0.4m'
);
assert(
  !coversPoint(found, 0, 1.5, depth / 2),
  'vão da porta: na altura do player não há caixa alta de fundação'
);
assert(
  coversPoint(found, -doorW / 2 - 0.4, -1, depth / 2),
  'fundação à esquerda da porta continua sólida'
);
assert(
  coversPoint(found, 0, 0.1, depth / 2 + 1.2),
  'plinto da entrada é sólido (topo ~0.2m, player não atravessa o lado)'
);

const door = doorwayVolume({ depth, doorW, doorH });
assert(door.maxX - door.minX === doorW, 'doorway tem a largura da porta');
assert(door.maxY === doorH, 'doorway sobe até a lintel');
assert(
  isInsideDoorway(0, 1.8, depth / 2, door),
  'centro da porta está na zona de exceção'
);
assert(
  isInsideDoorway(0, 1.8, depth / 2 + 2.5, door),
  'patamar externo da entrada está na zona de exceção'
);
assert(
  !isInsideDoorway(width / 2, 1.8, 0, door),
  'parede leste NÃO é doorway'
);
assert(
  !isInsideDoorway(0, 1.8, -depth / 2, door),
  'parede de fundo NÃO é doorway'
);

assert(
  shouldSkipWallInDoorway(true, 0, 14, 0.45),
  'dentro do doorway, parede alta é ignorada'
);
assert(
  !shouldSkipWallInDoorway(false, 0, 14, 0.45),
  'fora do doorway, parede alta NÃO é ignorada'
);
assert(
  !shouldSkipWallInDoorway(true, 0, 0.35, 0.0),
  'dentro do doorway, degrau baixo continua sólido (auto-step)'
);

const rot90 = worldAabbFromLocal(door, 22, 32, 3, Math.cos(-Math.PI / 2), -Math.sin(-Math.PI / 2));
const doorCenterLocal = { x: 0, z: depth / 2 };
const wx = 22 + doorCenterLocal.x * Math.cos(-Math.PI / 2) - doorCenterLocal.z * (-Math.sin(-Math.PI / 2));
const wz = 32 + doorCenterLocal.x * (-Math.sin(-Math.PI / 2)) + doorCenterLocal.z * Math.cos(-Math.PI / 2);
assert(
  wx >= rot90.minX && wx <= rot90.maxX && wz >= rot90.minZ && wz <= rot90.maxZ,
  'doorway rotacionado 90° ainda cobre o centro da porta'
);

const steps = ioComplexStepBoxes(100, 10, 200);
assert(steps.length === 12, 'IOComplex tem 12 degraus');
assert(Math.abs(steps[0].floorY - (10 + 0.8)) < 1e-9, 'primeiro degrau: topo em y+0.8');
assert(Math.abs(steps[11].floorY - (10 + 0.6 + 11 * 0.58 + 0.2)) < 1e-9, 'último degrau chega perto do mezanino');
assert(steps[1].maxY - steps[0].maxY > 0.50, 'subida > auto-step de caixa → precisa de floor collider');
assert(
  steps.every(s => s.maxX - s.minX >= 3.4),
  'degraus largos o suficiente para o player (raio 0.45)'
);

if (process.exitCode) {
  console.error('\nbuildingColliders tests FAILED');
  process.exit(1);
}
console.log('\nbuildingColliders tests passed');
