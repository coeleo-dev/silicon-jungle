/**
 * D2: pistola ≠ rifle ≠ escopeta (burst/splash/cooldown/spread).
 * Rode: node js/weapons/weaponFeel.test.mjs
 */
import { CONFIG } from '../config/constants.js';
import { burstCount, splashRadius, hitRadius, cameraKick, feelsDistinct } from './weaponFeel.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const pistol = CONFIG.WEAPONS.PLASMA_PISTOL;
const rifle = CONFIG.WEAPONS.BUS_RIFLE;
const shotgun = CONFIG.WEAPONS.ARC_SHOTGUN;

assert(burstCount(pistol) === 3, 'pistola dispara rajada de 3');
assert(splashRadius(pistol) > 0, 'pistola plasma tem splash');
assert(burstCount(rifle) === 1, 'rifle é semi-auto (1 projétil)');
assert(splashRadius(rifle) === 0, 'rifle sem splash');
assert(hitRadius(rifle) < hitRadius(pistol), 'rifle hitRadius menor (mais preciso)');
assert(rifle.COOLDOWN > pistol.COOLDOWN, 'rifle é mais lento que a pistola');
assert(cameraKick(rifle) > 0, 'rifle tem kick de câmera');
assert(cameraKick(pistol) === 0, 'pistola sem kick extra');
assert((shotgun.PELLETS || 0) >= 6, 'escopeta tem vários pellets');
assert((shotgun.SPREAD || 0) > 0, 'escopeta tem spread');
assert(feelsDistinct(pistol, rifle), 'pistola ≠ rifle');
assert(feelsDistinct(rifle, shotgun), 'rifle ≠ escopeta');
assert(feelsDistinct(pistol, shotgun), 'pistola ≠ escopeta');

if (process.exitCode) console.error('weaponFeel tests failed');
else console.log('weaponFeel tests passed');
