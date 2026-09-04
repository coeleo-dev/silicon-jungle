/** Catálogo de peças: type → inventoryKey / recipeId / label. */
export const BUILD_CATALOG = {
  floor: { type: 'floor', inventoryKey: 'pcbFloor', recipeId: 'pcb_floor', label: 'PCB FLOOR', costHint: '2 wires' },
  wall: { type: 'wall', inventoryKey: 'pcbWall', recipeId: 'pcb_wall', label: 'PCB WALL', costHint: '2 wires' },
  door: { type: 'door', inventoryKey: 'pcbDoor', recipeId: 'pcb_door', label: 'PCB DOOR', costHint: '2 wires + 1 crystal' },
  stair: { type: 'stair', inventoryKey: 'pcbStair', recipeId: 'pcb_stair', label: 'PCB STAIR', costHint: '3 wires' },
  crate: { type: 'crate', inventoryKey: 'pcbCrate', recipeId: 'pcb_crate', label: 'PCB CRATE', costHint: '4 wires' },
  bench: { type: 'bench', inventoryKey: 'pcbBench', recipeId: 'pcb_bench', label: 'PCB BENCH', costHint: '6 wires + 1 crystal' }
};

export const BUILD_TYPE_ORDER = ['floor', 'wall', 'door', 'stair', 'crate', 'bench'];

export function getCatalogEntry(type) {
  return BUILD_CATALOG[type] || null;
}

export function listImplementedTypes() {
  return BUILD_TYPE_ORDER.slice();
}
