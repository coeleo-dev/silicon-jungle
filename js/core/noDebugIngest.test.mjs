/**
 * Nenhum ingest de debug (porta 7736) no código de jogo.
 * Rode: node --test js/core/noDebugIngest.test.mjs
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

describe('debug ingest', () => {
  it('js/ não menciona 7736', () => {
    const hits = [];
    for (const file of walkJs(jsRoot)) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('7736')) hits.push(file.slice(jsRoot.length + 1));
    }
    assert.deepEqual(hits, []);
  });
});
