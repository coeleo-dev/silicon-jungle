import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EVENTS } from './events.js';

const dir = dirname(fileURLToPath(import.meta.url));

describe('EVENTS catalog', () => {
  it('lists the names already used in the bus', () => {
    assert.equal(EVENTS.UI_BANNER, 'ui:banner');
    assert.equal(EVENTS.ENTITY_DAMAGED, 'entity:damaged');
    assert.equal(EVENTS.ENTITY_KILLED, 'entity:killed');
    assert.equal(EVENTS.ITEM_COLLECTED, 'item:collected');
    assert.equal(EVENTS.COMBAT_ATTACKED, 'combat:attacked');
    assert.equal(EVENTS.COMBAT_MELEE, 'combat:melee');
    assert.equal(EVENTS.COMBAT_HIT, 'combat:hit');
    assert.equal(EVENTS.PLAYER_DAMAGED, 'player:damaged');
    assert.equal(EVENTS.AUDIO_PLAY, 'audio:play');
  });

  it('craftingDomain does not import hud showBanner', () => {
    const src = readFileSync(join(dir, 'craftingDomain.js'), 'utf8');
    assert.equal(src.includes('showBanner'), false);
    assert.equal(src.includes('ui/hud'), false);
    assert.equal(src.includes('EVENTS.UI_BANNER'), true);
  });
});
