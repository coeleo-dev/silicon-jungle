import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  campaign,
  resetCampaign,
  setBusRestored,
  areAllBusesRestored,
  setPhenomDefeated,
  applyCampaignState
} from './campaign.js';

describe('campaign flags', () => {
  beforeEach(() => {
    resetCampaign();
  });

  it('setBusRestored turns atx on and ignores unknown ids', () => {
    setBusRestored('atx');
    assert.equal(campaign.buses.atx, true);
    assert.equal(campaign.buses.dimm, false);
    setBusRestored('not_a_bus');
    assert.equal(campaign.buses.atx, true);
    assert.deepEqual(Object.keys(campaign.buses).sort(), ['atx', 'dimm', 'heatsink', 'io']);
  });

  it('areAllBusesRestored is false until all four buses are true', () => {
    assert.equal(areAllBusesRestored(), false);
    setBusRestored('atx');
    setBusRestored('dimm');
    setBusRestored('io');
    assert.equal(areAllBusesRestored(), false);
    setBusRestored('heatsink');
    assert.equal(areAllBusesRestored(), true);
  });

  it('phenomDefeated defaults false and can be set', () => {
    assert.equal(campaign.phenomDefeated, false);
    setPhenomDefeated(true);
    assert.equal(campaign.phenomDefeated, true);
  });

  it('applyCampaignState merges a saved snapshot', () => {
    applyCampaignState({
      buses: { atx: true, dimm: false },
      phenomDefeated: true
    });
    assert.equal(campaign.buses.atx, true);
    assert.equal(campaign.buses.heatsink, false);
    assert.equal(campaign.phenomDefeated, true);
  });
});
