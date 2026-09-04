/**
 * biomeLoot — recurso exclusivo por bioma (P20). Dados puros.
 */

export const EXCLUSIVE_RESOURCE = Object.freeze({
  circuit_plain: null,
  smd_metro: 'pureSilicon',
  thermal_swamp: 'silverCompound',
  atx_wastes: 'lithiumCells',
  capacitor_caves: 'electrolyte',
  cooler_vortex: 'tiCuAlloy'
});

export const EXCLUSIVE_LABEL = Object.freeze({
  pureSilicon: 'Pure Silicon',
  silverCompound: 'Silver Compound',
  lithiumCells: 'Lithium Cells',
  electrolyte: 'Electrolyte',
  tiCuAlloy: 'Ti/Cu Alloy'
});

export const EXCLUSIVE_COLOR = Object.freeze({
  pureSilicon: 0xc4d4e0,
  silverCompound: 0x9aa8b5,
  lithiumCells: 0x3dff9a,
  electrolyte: 0x7c5cff,
  tiCuAlloy: 0xe8a87c
});

export function exclusiveResource(biomeId) {
  return EXCLUSIVE_RESOURCE[biomeId] ?? null;
}
