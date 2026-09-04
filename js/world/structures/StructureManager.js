/**
 * StructureManager — Orquestrador da Metrópole e Megaestruturas de Hardware
 * Constrói 50+ arranha-céus em ruínas, ruas asfaltadas, carros destruídos, postes piscando e cidadelas.
 */
import { CPUCitadel } from './CPUCitadel.js?v=20260821';
import { ATXBunker } from './ATXBunker.js?v=20260821';
import { CapacitorCavern } from './CapacitorCavern.js?v=20260821';
import { IOComplex } from './IOComplex.js?v=20260821';
import { DIMMSpires } from './DIMMSpires.js?v=20260821';
import { CityLayoutManager } from './CityLayoutManager.js?v=20260912';
import { UrbanScatterManager } from './UrbanScatterManager.js?v=20260912';
import { RenderOptimizer } from '../../core/RenderOptimizer.js?v=20260912';
import { spatialExclusionService } from '../../core/SpatialExclusionService.js?v=20260821';
import { interactiveRegistry } from '../../core/InteractiveRegistry.js?v=20260821';

export { interactiveRegistry };

export const animatedStructures = [];

export class StructureManager {
  static build(gameContext) {
    // 1. Grande Metrópole de Ruínas Eletrônicas (40+ Edifícios e Arranha-Céus)
    CityLayoutManager.build();

    // 2. Infraestrutura Urbana (Ruas Rachadas, Carros Destruídos, Postes com Luzes Piscando)
    UrbanScatterManager.build();

    // 3. Megaestruturas Landmark Principais
    CPUCitadel.build(70, -70, animatedStructures);
    ATXBunker.build(-80, 80);
    CapacitorCavern.build(-90, -20);
    IOComplex.build(-80, -80, animatedStructures);
    DIMMSpires.build(80, 80);

    // 4. Registro no SpatialExclusionService
    spatialExclusionService.registerBuilding('cpu_citadel', 70, -70, 36, 36, 0, 4.0);
    spatialExclusionService.registerBuilding('atx_bunker', -80, 80, 32, 32, 0, 4.0);
    spatialExclusionService.registerBuilding('capacitor_cavern', -90, -20, 28, 28, 0, 3.0);
    spatialExclusionService.registerBuilding('io_complex', -80, -80, 32, 32, 0, 4.0);
    spatialExclusionService.registerBuilding('dimm_spires', 80, 80, 38, 38, 0, 4.0);
  }

  static update(delta, time, cameraPos, camera) {
    if (cameraPos) {
      RenderOptimizer.update(cameraPos, camera);
    }

    // Atualizar estruturas com rotação holográfica
    for (let i = 0; i < animatedStructures.length; i++) {
      const item = animatedStructures[i];
      if (item.mesh) {
        item.mesh.rotation.y += delta * (item.rotSpeed || 1.0);
      }
    }

    // Atualizar postes piscantes e faíscas urbanas
    UrbanScatterManager.update(delta, time, cameraPos);
  }
}
