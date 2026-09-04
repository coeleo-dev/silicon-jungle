import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { instanceShouldCastShadow } from './instanceShadow.js';

describe('instanceShouldCastShadow', () => {
  it('honors bushCastShadow=false on bushes', () => {
    assert.equal(instanceShouldCastShadow(true, true, false), false);
  });

  it('lets bushes cast when the quality flag is on', () => {
    assert.equal(instanceShouldCastShadow(true, true, true), true);
  });

  it('does not strip shadow from non-bush casters', () => {
    assert.equal(instanceShouldCastShadow(true, false, false), true);
  });
});
