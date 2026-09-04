import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ensurePerfCounters } from './perfCounters.js';

describe('perfCounters', () => {
  it('ensurePerfCounters sets autoReset true', () => {
    const renderer = { info: { autoReset: false, render: {}, memory: {} } };
    ensurePerfCounters(renderer);
    assert.equal(renderer.info.autoReset, true);
  });

  it('ensurePerfCounters noops without renderer', () => {
    ensurePerfCounters(null);
    ensurePerfCounters({});
  });
});
