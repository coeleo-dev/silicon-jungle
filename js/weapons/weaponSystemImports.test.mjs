/**
 * Um único módulo WeaponSystem: query strings ?v= diferentes criam
 * duas instâncias ES (duas pistolas na câmera).
 * Rode: node js/weapons/weaponSystemImports.test.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (extname(p) === '.js') acc.push(p);
  }
  return acc;
}

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
}

const importRe = /WeaponSystem\.js\?v=(\d+)/g;
const versions = new Set();
const hits = [];

for (const file of walk(jsRoot)) {
  const text = readFileSync(file, 'utf8');
  importRe.lastIndex = 0;
  let m;
  while ((m = importRe.exec(text))) {
    versions.add(m[1]);
    hits.push(`${file.replace(jsRoot + '/', '')} → ${m[1]}`);
  }
}

assert(hits.length >= 3, `main, player e inventory devem importar WeaponSystem (achados: ${hits.length})`);
assert(
  versions.size === 1,
  `todas as importações de WeaponSystem.js devem usar o mesmo ?v=; versões=${[...versions].join(',')} hits=${hits.join(' | ')}`
);

if (process.exitCode) console.error('weaponSystemImports tests failed');
else console.log('weaponSystemImports tests passed');
