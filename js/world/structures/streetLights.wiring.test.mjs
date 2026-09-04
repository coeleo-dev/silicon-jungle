import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

describe('F3 street lights', () => {
  it('UrbanScatterManager does not construct PointLight per pole', () => {
    const src = readFileSync(join(dir, 'UrbanScatterManager.js'), 'utf8');
    assert.equal(src.includes('light = new THREE.PointLight'), false);
    assert.match(src, /streetLightPool|MAX_ACTIVE_STREET_LIGHTS/);
  });
});
