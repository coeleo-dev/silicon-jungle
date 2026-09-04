/**
 * Estado vivo da campanha open-world (P03). Persistido no envelope de save v4.
 */

const BUS_IDS = ['atx', 'dimm', 'io', 'heatsink'];

export function emptyCampaign() {
  return {
    buses: { atx: false, dimm: false, io: false, heatsink: false },
    phenomDefeated: false
  };
}

export const campaign = emptyCampaign();

export function resetCampaign() {
  const fresh = emptyCampaign();
  campaign.buses = fresh.buses;
  campaign.phenomDefeated = fresh.phenomDefeated;
  return campaign;
}

export function setBusRestored(id) {
  if (!BUS_IDS.includes(id)) return campaign;
  campaign.buses[id] = true;
  return campaign;
}

export function areAllBusesRestored() {
  return BUS_IDS.every((id) => campaign.buses[id] === true);
}

export function setPhenomDefeated(value = true) {
  campaign.phenomDefeated = !!value;
  return campaign;
}

export function applyCampaignState(saved) {
  const fresh = emptyCampaign();
  campaign.buses = { ...fresh.buses, ...(saved?.buses || {}) };
  campaign.phenomDefeated = typeof saved?.phenomDefeated === 'boolean' ? saved.phenomDefeated : false;
  return campaign;
}

export function snapshotCampaign() {
  return {
    buses: { ...campaign.buses },
    phenomDefeated: campaign.phenomDefeated
  };
}
