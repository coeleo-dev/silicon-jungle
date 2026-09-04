/**
 * Sobe a escada interna do IOComplex via lajes (subida 0.58m > auto-step de caixa).
 * Rode: node js/world/structures/buildings/ioComplexWalk.sim.mjs
 */
import { ioComplexStepBoxes } from './buildingColliders.js';
import { isSlabInFootBand } from '../../../utils/floorBand.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const originY = 4;
const groundFloor = originY + 1.0;
const mezzanine = originY + 8.0;
const steps = ioComplexStepBoxes(0, originY, 0);

let footY = groundFloor;
let used = 0;
for (const s of steps) {
  if (s.floorY > footY && isSlabInFootBand(s.floorY, footY)) {
    footY = s.floorY;
    used++;
  }
}

assert(used >= 10, `sobe a maioria dos degraus (usou ${used}/12)`);
assert(footY >= mezzanine - 0.85, `último degrau alcança o mezanino (pé=${footY.toFixed(2)}, mez=${mezzanine})`);
assert(isSlabInFootBand(mezzanine, footY), 'faixa dos pés pega o piso do mezanino a partir do último degrau');

if (process.exitCode) {
  console.error('\nIOComplex walk sim FAILED');
  process.exit(1);
}
console.log('\nIOComplex walk sim passed');
