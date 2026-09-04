/**
 * particles.js — Sistema de Partículas com Object Pooling de Alta Performance
 * Zero alocações por explosão, reutilização de Buffers e remoção de overhead do Garbage Collector.
 */
import { scene } from '../core/scene.js?v=20260821';

export const activeSparks = [];

const POOL_SIZE = 32;
const MAX_PARTICLES_PER_BURST = 40;

class ParticlePool {
  constructor() {
    this.pool = [];
    this.freeList = [];
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    for (let i = 0; i < POOL_SIZE; i++) {
      const positions = new Float32Array(MAX_PARTICLES_PER_BURST * 3);
      const velocities = [];
      for (let v = 0; v < MAX_PARTICLES_PER_BURST; v++) {
        velocities.push({ x: 0, y: 0, z: 0 });
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setDrawRange(0, 0);

      const material = new THREE.PointsMaterial({
        color: 0x00ffaa,
        size: 0.35,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const points = new THREE.Points(geometry, material);
      points.visible = false;
      scene.add(points);

      const particleItem = {
        id: i,
        system: points,
        positions: positions,
        velocities: velocities,
        activeCount: 0,
        life: 0,
        maxLife: 0.45,
        inUse: false
      };

      this.pool.push(particleItem);
      this.freeList.push(particleItem);
    }
  }

  acquire(position, colorHex, count, lifeDuration = 0.45) {
    if (!this.initialized) {
      this.init();
    }

    let item = this.freeList.pop();
    if (!item) {
      // Se todos estiverem em uso, recicla o mais antigo
      item = activeSparks.shift();
      if (!item) return;
    }

    const n = Math.min(count, MAX_PARTICLES_PER_BURST);
    item.activeCount = n;
    item.life = lifeDuration;
    item.maxLife = lifeDuration;
    item.inUse = true;

    const pos = item.positions;
    for (let i = 0; i < n; i++) {
      pos[i * 3 + 0] = position.x;
      pos[i * 3 + 1] = position.y;
      pos[i * 3 + 2] = position.z;

      item.velocities[i].x = (Math.random() - 0.5) * 12;
      item.velocities[i].y = Math.random() * 8 + 2;
      item.velocities[i].z = (Math.random() - 0.5) * 12;
    }

    item.system.geometry.attributes.position.needsUpdate = true;
    item.system.geometry.setDrawRange(0, n);
    item.system.material.color.setHex(colorHex);
    item.system.material.opacity = 1.0;
    item.system.visible = true;

    activeSparks.push(item);
  }

  release(item, indexInActive) {
    item.inUse = false;
    item.system.visible = false;
    item.system.geometry.setDrawRange(0, 0);
    this.freeList.push(item);
    if (indexInActive !== undefined && indexInActive >= 0) {
      activeSparks.splice(indexInActive, 1);
    }
  }
}

const particlePool = new ParticlePool();

/**
 * Cria uma explosão de faíscas usando o Object Pool de alta performance
 */
export function createSparkBurst(position, colorHex = 0x00ffaa, count = 15) {
  particlePool.acquire(position, colorHex, count);
}

/**
 * Atualização contínua de partículas por frame
 */
export function updateParticles(delta) {
  for (let i = activeSparks.length - 1; i >= 0; i--) {
    const spark = activeSparks[i];
    spark.life -= delta;

    const arr = spark.positions;
    const count = spark.activeCount;

    for (let j = 0; j < count; j++) {
      const v = spark.velocities[j];
      arr[j * 3 + 0] += v.x * delta;
      arr[j * 3 + 1] += v.y * delta;
      arr[j * 3 + 2] += v.z * delta;
      v.y -= 18.0 * delta;
    }

    spark.system.geometry.attributes.position.needsUpdate = true;
    spark.system.material.opacity = Math.max(0, spark.life / spark.maxLife);

    if (spark.life <= 0) {
      particlePool.release(spark, i);
    }
  }
}
