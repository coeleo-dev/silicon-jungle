/**
 * Nenhum identificador interactiveObjects em js/ (A6).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const jsRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function walkJs(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walkJs(p, acc);
    } else if (extname(p) === '.js') acc.push(p);
  }
  return acc;
}

describe('A6', () => {
  it('js/ has no interactiveObjects', () => {
    const hits = [];
    for (const file of walkJs(jsRoot)) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('interactiveObjects')) hits.push(file.slice(jsRoot.length + 1));
    }
    assert.deepEqual(hits, []);
  });
});
