/**
 * Um único ?v= por módulo crítico: query strings diferentes criam dois singletons ES.
 * Rode: node --test js/core/moduleStamps.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
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

function versionsOf(basename) {
  const re = new RegExp(`${basename.replaceAll('.', '\\.')}\\?v=(\\d+)`, 'g');
  const versions = new Set();
  const hits = [];
  for (const file of walk(jsRoot)) {
    const text = readFileSync(file, 'utf8');
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) {
      versions.add(m[1]);
      hits.push(`${file.slice(jsRoot.length + 1)} → ${m[1]}`);
    }
  }
  return { versions, hits };
}

for (const name of ['inventory.js', 'hud.js', 'constants.js', 'SpiderBotEntity.js']) {
  describe(name, () => {
    it('um único ?v=', () => {
      const { versions, hits } = versionsOf(name);
      assert.ok(hits.length >= 1, `nenhum import de ${name}`);
      assert.equal(versions.size, 1, `versões=${[...versions].join(',')} hits=${hits.join(' | ')}`);
    });
  });
}
