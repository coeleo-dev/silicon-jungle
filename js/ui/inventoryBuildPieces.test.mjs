import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const root = join(dir, '../..');

describe('inventory PCB pieces', () => {
  it('mochila mostra stacks pcbFloor/pcbDoor (não só recursos antigos)', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const ui = readFileSync(join(dir, 'inventoryUI.js'), 'utf8');
    assert.match(html, /inv-res-pcb-floor/);
    assert.match(html, /inv-res-pcb-door/);
    assert.match(ui, /pcbFloor/);
    assert.match(ui, /inv-res-pcb-floor/);
  });
});
