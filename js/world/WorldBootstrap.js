/**
 * WorldBootstrap — pipeline de boot do mundo (A4).
 * Game.init só orquestra loading + player/save/UI; o conteúdo 3D nasce aqui.
 */
import { buildTerrain } from './terrain.js?v=20260824';
import { GroundScatter } from './terrain/GroundScatter.js?v=20260828';
import { VegetationManager } from './vegetation/VegetationManager.js?v=20260912';
import { StructureManager } from './structures/StructureManager.js?v=20260912';
import { buildCollectiblesAndShelters, updateCollectibles } from './collectibles.js?v=20260912';
import { initLootWorld, updateLoot } from './loot.js?v=20260912';
import {
  setStreamingOrigin,
  enableStreaming,
  setVegetationLoader,
  setVegetationUnloader
} from './chunkStore.js?v=20260903';
import { loadChunkVegetation, unloadChunkVegetation } from './chunkVegetation.js?v=20260903';
import { scene } from '../core/scene.js?v=20260821';
import { getBiomeAt } from './biomeMap.js?v=20260904';
import { fogForBiome } from './biomeVisuals.js?v=20260904';
import { worldClock, applyTodFog } from './worldClock.js?v=20260911';

const _fogColor = new THREE.Color();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class WorldBootstrap {
  /**
   * @param {object} ctx contexto de jogo (player/HUD callbacks)
   * @param {{ onProgress?: (pct: number, msg: string) => void }} [opts]
   */
  static async build(ctx, { onProgress } = {}) {
    const progress = (pct, msg) => {
      if (onProgress) onProgress(pct, msg);
    };

    progress(35, 'Generating organic terrain and ground meshes...');
    buildTerrain();
    GroundScatter.build();
    await delay(60);

    progress(60, 'Building the ruined metropolis and interiors...');
    StructureManager.build(ctx);
    await delay(60);

    progress(80, 'Planting canopy and jungle ecosystem...');
    VegetationManager.build(ctx);
    buildCollectiblesAndShelters(ctx);
    initLootWorld();
    GroundScatter.bindToChunks();
    VegetationManager.bindToChunks();
    setVegetationLoader(loadChunkVegetation);
    setVegetationUnloader(unloadChunkVegetation);
    enableStreaming(true);
    setStreamingOrigin(0, 30);
    await delay(60);
  }

  static tick(delta, time, cameraPos, camera) {
    if (cameraPos) setStreamingOrigin(cameraPos.x, cameraPos.z);
    if (cameraPos && scene.fog) {
      const fog = applyTodFog(fogForBiome(getBiomeAt(cameraPos.x, cameraPos.z)), worldClock.timeOfDay);
      _fogColor.setHex(fog.color);
      scene.fog.color.lerp(_fogColor, Math.min(1, delta * 1.8));
      scene.fog.near += (fog.near - scene.fog.near) * Math.min(1, delta * 1.8);
      scene.fog.far += (fog.far - scene.fog.far) * Math.min(1, delta * 1.8);
    }
    VegetationManager.update(delta, time);
    StructureManager.update(delta, time, cameraPos, camera);
    updateCollectibles(delta, time, cameraPos);
    updateLoot(delta, time, cameraPos);
  }
}
