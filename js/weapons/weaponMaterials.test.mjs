/**
 * D1: armas não usam textura de piso; materiais dedicados existem no arquivo de texturas.
 * Rode: node js/weapons/weaponMaterials.test.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const factorySrc = readFileSync(join(dir, 'WeaponModelFactory.js'), 'utf8');
const texturesSrc = readFileSync(join(dir, '../core/textures.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

assert(!factorySrc.includes('DIAMOND_PLATE_FLOOR'), 'fábrica de armas não usa DIAMOND_PLATE_FLOOR');
assert(texturesSrc.includes('WEAPON_POLYMER'), 'WEAPON_POLYMER definido');
assert(texturesSrc.includes('WEAPON_STEEL'), 'WEAPON_STEEL definido');
assert(texturesSrc.includes('WEAPON_NEON'), 'WEAPON_NEON definido');
assert(factorySrc.includes('WEAPON_STEEL') || factorySrc.includes('WEAPON_POLYMER'), 'modelos usam material de arma');

if (process.exitCode) console.error('weaponMaterials tests failed');
else console.log('weaponMaterials tests passed');
