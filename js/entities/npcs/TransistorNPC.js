/**
 * TransistorNPC — Habitantes Amigáveis Encapsulamento TO-92
 * Suporta dois tipos:
 * 1. Estáticos (Líderes e Ferreiros em lojas/praças de livre acesso).
 * 2. Andarilhos Reativos (Civis que caminham pelo mapa, reagem com pânico e fuga a inimigos e conversam com o player).
 */
import { NPCEntity } from '../base/NPCEntity.js?v=20260830';
import { scene, camera, createCelMaterial } from '../../core/scene.js?v=20260821';
import { TOON_MATERIALS } from '../../core/textures.js?v=20260821';
import { audioService } from '../../core/AudioService.js?v=20260821';
import { startDialogue } from '../../ui/dialogue.js?v=20260821';
import { openCraftingMenu } from '../../ui/crafting.js?v=20260912';
import { openTradeMenu, TRADE_STOCK } from '../../ui/trade.js?v=20260821';
import { worldService } from '../../core/WorldService.js?v=20260821';
import { entityRegistry } from '../../core/EntityRegistry.js?v=20260830';
import { interactiveRegistry } from '../../core/InteractiveRegistry.js?v=20260821';
import { showBanner } from '../../ui/hud.js?v=20260912';
import { spatialExclusionService } from '../../core/SpatialExclusionService.js?v=20260821';
import { applyToonOutlinesToMeshes } from '../../core/outline.js?v=20260826';
import { resolveEntitySpawn } from '../../world/spawnResolver.js?v=20260821';

export const transistorNPCs = [];

const _tDir = new THREE.Vector3();
const _tPos = new THREE.Vector3();

export class TransistorNPC extends NPCEntity {
  /**
   * @param {string} id 
   * @param {string} name 
   * @param {string} role 
   * @param {number} startX 
   * @param {number} startZ 
   * @param {string[]} dialogueLines 
   * @param {THREE.Vector3} [shelterPos] 
   * @param {boolean} [isWanderer=false] Se o NPC anda livremente pelo mapa
   * @param {object} [gameContext=null] Contexto do jogo (para abrir menus)
   * @param {Array} [tradeStock=null] Estoque de comércio (habilita o modo ferreiro)
   */
  constructor(id, name, role, startX, startZ, dialogueLines, shelterPos, isWanderer = false, gameContext = null, tradeStock = null) {
    const spawn = resolveEntitySpawn(startX, startZ, 0.7);
    super({
      type: 'transistor_npc',
      name: name,
      position: { x: spawn.x, y: spawn.y, z: spawn.z },
      interactDistance: 4.5
    });

    this.npcId = id;
    this.role = role;
    if (shelterPos) {
      const shelter = resolveEntitySpawn(shelterPos.x, shelterPos.z, 0.7);
      this.shelterPos = new THREE.Vector3(shelter.x, shelter.y, shelter.z);
    } else {
      this.shelterPos = new THREE.Vector3(spawn.x, spawn.y, spawn.z);
    }
    this.homeX = spawn.x;
    this.homeZ = spawn.z;
    this.isWanderer = isWanderer;
    this.state = 'CALM'; // CALM, TALKING, PANIC
    this.panicTimer = 0;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.wanderTimer = Math.random() * 4.0;
    this.dialogueLines = dialogueLines;
    this.gameContext = gameContext;
    this.tradeStock = tradeStock;
    this.walkAnimTime = 0;
    this.speed = isWanderer ? 3.8 : 0;

    this.legs = [];
    this.eyeMat = null;
    this.bodyMesh = null;
    this.frontPlate = null;

    this.buildModel();
    applyToonOutlinesToMeshes([this.bodyMesh, this.frontPlate], 0.035);

    if (!isWanderer) {
      spatialExclusionService.registerProp(`npc_${id}`, spawn.x, spawn.z, 1.2, 'NPC', 1.8);
    }

    transistorNPCs.push(this);
  }

  buildModel() {
    const bodyMat = TOON_MATERIALS.METAL_BRUSHED_STEEL;
    const silverMat = createCelMaterial(0xe2e8f0);
    this.eyeMat = new THREE.MeshBasicMaterial({ color: this.isWanderer ? 0x38bdf8 : 0x00ffaa });

    // 1. Corpo TO-92
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.85, 8, 1, false, 0, Math.PI);
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.y = 0.75;
    this.bodyMesh.rotation.y = Math.PI / 2;
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    this.frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.85, 0.08), bodyMat);
    this.frontPlate.position.set(0, 0.75, 0.04);
    this.frontPlate.castShadow = true;
    this.group.add(this.frontPlate);

    const eyeGeo = new THREE.BoxGeometry(0.14, 0.1, 0.06);
    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    leftEye.position.set(-0.18, 0.85, 0.09);
    this.group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMat);
    rightEye.position.set(0.18, 0.85, 0.09);
    this.group.add(rightEye);

    // 2. Três Perninhas Prateadas (E, B, C)
    const legGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.65, 6);
    [-0.22, 0.0, 0.22].forEach((ox, idx) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(ox, 0.45, 0);

      const legMesh = new THREE.Mesh(legGeo, silverMat);
      legMesh.position.y = -0.28;
      legMesh.castShadow = false;
      legPivot.add(legMesh);

      this.group.add(legPivot);
      this.legs.push({ pivot: legPivot, basePhase: idx * Math.PI * 0.6 });
    });

    const userData = {
      type: 'transistor_npc',
      name: this.name,
      prompt: this.tradeStock ? `[E] TRADE WITH ${this.name.toUpperCase()}` : `[E] TALK TO ${this.name.toUpperCase()}`,
      action: () => this.interact(this.gameContext)
    };

    this.group.userData = userData;
    this.bodyMesh.userData = userData;
    this.frontPlate.userData = userData;

    interactiveRegistry.register(this.group);
    interactiveRegistry.register(this.bodyMesh);
    interactiveRegistry.register(this.frontPlate);
  }

  talk() {
    if (this.state === 'PANIC') return;
    this.state = 'TALKING';
    if (this.eyeMat) this.eyeMat.color.setHex(0xf59e0b);

    startDialogue(this.name, this.role, this.dialogueLines, () => {
      this.state = 'CALM';
      if (this.eyeMat) this.eyeMat.color.setHex(this.isWanderer ? 0x38bdf8 : 0x00ffaa);
    });
  }

  interact(gameContext) {
    if (this.tradeStock) {
      openTradeMenu(this.name, gameContext);
    } else {
      this.talk();
    }
  }

  update(delta, time, ctx) {
    const playerPos = (camera && camera.position) ? camera.position : (ctx?.playerPos || ctx?.camera?.position);
    let threatNearby = false;
    let nearestEnemyPos = null;

    // Checar ameaças de inimigos vivos via EntityRegistry
    const nearbySpiders = entityRegistry.getNearby(this.group.position, 18, 'spider_bot');
    const nearbySentinels = entityRegistry.getNearby(this.group.position, 18, 'sentinel');
    const nearbyEnemies = nearbySpiders.concat(nearbySentinels);

    if (nearbyEnemies.length > 0) {
      threatNearby = true;
      nearestEnemyPos = nearbyEnemies[0].position || nearbyEnemies[0].group?.position;
    }

    // Máquina de Estados: CALM, PANIC, TALKING
    if (threatNearby) {
      if (this.state !== 'PANIC') {
        this.state = 'PANIC';
        this.panicTimer = 6.0;
        if (this.eyeMat) this.eyeMat.color.setHex(0xef4444);
        audioService.play('playTransistorPanic');
        if (Math.random() < 0.35) {
          showBanner(`${this.name}: "HELP! ENEMIES IN THE SECTOR!"`, '⚠️');
        }
      }
    } else if (this.state === 'PANIC') {
      this.panicTimer -= delta;
      if (this.panicTimer <= 0) {
        this.state = 'CALM';
        if (this.eyeMat) this.eyeMat.color.setHex(this.isWanderer ? 0x38bdf8 : 0x00ffaa);
      }
    }

    if (this.state === 'PANIC') {
      // Fugir na direção oposta ao inimigo ou em direção ao abrigo seguro
      if (nearestEnemyPos) {
        _tDir.copy(this.group.position).sub(nearestEnemyPos).setY(0).normalize();
      } else {
        _tDir.copy(this.shelterPos).sub(this.group.position).setY(0).normalize();
      }

      this.group.rotation.y = Math.atan2(_tDir.x, _tDir.z);
      _tPos.copy(this.group.position).addScaledVector(_tDir, (this.speed > 0 ? this.speed * 2.2 : 5.0) * delta);
      
      // Limitar dentro dos limites do mundo
      _tPos.x = Math.max(-180, Math.min(180, _tPos.x));
      _tPos.z = Math.max(-180, Math.min(180, _tPos.z));

      if (!worldService.checkEntityCollision(_tPos, 0.4)) {
        this.group.position.x = _tPos.x;
        this.group.position.z = _tPos.z;
      }
      this.walkAnimTime += delta * 26;

    } else if (this.state === 'CALM') {
      if (playerPos) {
        const distToPlayer = this.distanceTo(playerPos);

        // Se o player estiver muito próximo (< 4m), parar e olhar para ele amigavelmente
        if (distToPlayer < 4.5) {
          _tDir.copy(playerPos).sub(this.group.position).setY(0).normalize();
          this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, Math.atan2(_tDir.x, _tDir.z), 0.15);
        } else if (this.isWanderer) {
          // NPC Andarilho passeando pelo mapa
          this.wanderTimer -= delta;
          if (this.wanderTimer <= 0) {
            this.wanderTimer = 3.0 + Math.random() * 5.0;
            this.wanderAngle += (Math.random() - 0.5) * 1.8;
          }

          _tDir.set(Math.sin(this.wanderAngle), 0, Math.cos(this.wanderAngle));
          this.group.rotation.y = THREE.MathUtils.lerp(this.group.rotation.y, this.wanderAngle, 0.1);

          _tPos.copy(this.group.position).addScaledVector(_tDir, this.speed * delta);
          _tPos.x = Math.max(-170, Math.min(170, _tPos.x));
          _tPos.z = Math.max(-170, Math.min(170, _tPos.z));

          if (!worldService.checkEntityCollision(_tPos, 0.45)) {
            this.group.position.x = _tPos.x;
            this.group.position.z = _tPos.z;
          } else {
            this.wanderAngle += Math.PI * 0.8;
          }

          this.walkAnimTime += delta * 12;
        } else {
          // NPC Estático em guarda/repouso
          this.group.rotation.y = Math.sin(time * 0.6 + this.wanderAngle) * 0.35;
        }
      }
    }

    this.alignToTerrain(worldService, 0.3);

    // Animação das três pernas
    this.legs.forEach(leg => {
      leg.pivot.rotation.x = Math.sin(this.walkAnimTime + leg.basePhase) * (this.state === 'PANIC' ? 0.75 : 0.28);
    });
  }

  /**
   * Constrói uma Bancada de Crafting em pedestal de concreto com holograma
   */
  static createWorkbench(x, z, rotY = 0, gameContext = null) {
    const y = worldService.getHeight(x, z);
    const benchGroup = new THREE.Group();

    const benchMat = TOON_MATERIALS.CONCRETE_BUNKER;
    const metalMat = TOON_MATERIALS.METAL_BRUSHED_STEEL;
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffaa });
    const copperMat = createCelMaterial(0xd97706);

    // Pedestal de Concreto
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 2.4), benchMat);
    plinth.position.y = 0.2;
    benchGroup.add(plinth);

    // Mesa de Trabalho
    const tableGeo = new THREE.BoxGeometry(2.8, 0.9, 1.5);
    const tableMesh = new THREE.Mesh(tableGeo, benchMat);
    tableMesh.position.y = 0.85;
    tableMesh.castShadow = true;
    benchGroup.add(tableMesh);

    // Protoboard & Ferramentas
    const breadboardGeo = new THREE.BoxGeometry(1.8, 0.08, 0.9);
    const breadboard = new THREE.Mesh(breadboardGeo, createCelMaterial(0xf8fafc));
    breadboard.position.set(-0.2, 1.34, 0);
    benchGroup.add(breadboard);

    const scopeGeo = new THREE.BoxGeometry(0.6, 0.5, 0.5);
    const scope = new THREE.Mesh(scopeGeo, metalMat);
    scope.position.set(0.8, 1.55, -0.2);
    benchGroup.add(scope);

    const scopeScreenGeo = new THREE.PlaneGeometry(0.35, 0.25);
    const scopeScreen = new THREE.Mesh(scopeScreenGeo, screenMat);
    scopeScreen.position.set(0.8, 1.55, 0.06);
    benchGroup.add(scopeScreen);

    // Holograma 3D Flutuante
    const holoGeo = new THREE.OctahedronGeometry(0.35, 0);
    const holoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
    const holoMesh = new THREE.Mesh(holoGeo, holoMat);
    holoMesh.position.set(0, 2.1, 0);
    benchGroup.add(holoMesh);

    benchGroup.position.set(x, y, z);
    benchGroup.rotation.y = rotY;
    scene.add(benchGroup);

    const workbenchUserData = {
      type: 'crafting_workbench',
      name: 'Forge & Circuit Crafting Bench',
      prompt: '[E] OPEN CRAFTING BENCH',
      action: () => openCraftingMenu(gameContext)
    };

    tableMesh.userData = workbenchUserData;
    breadboard.userData = workbenchUserData;
    holoMesh.userData = workbenchUserData;
    plinth.userData = workbenchUserData;

    interactiveRegistry.register(tableMesh);
    interactiveRegistry.register(breadboard);
    interactiveRegistry.register(holoMesh);
    interactiveRegistry.register(plinth);

    worldService.addCollider({
      type: 'box',
      box: new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, y + 1.0, z),
        new THREE.Vector3(3.2, 2.0, 2.0)
      )
    });

    spatialExclusionService.registerProp(`workbench_${x}_${z}`, x, z, 1.8, 'PROP', 1.5);

    return benchGroup;
  }

  static spawnAll(gameContext = null) {
    // ==========================================
    // 1. TIPO A: NPCS ESTÁTICOS (Líderes & Ferreiros)
    // ==========================================
    new TransistorNPC(
      'gate',
      'Elder Gate',
      'Circuit Village Leader',
      6, 22,
      [
        'Greetings, silicon traveler! Good to see a conscious circuit around here!',
        'Our metropolis used to be a thriving processing hub, until the tyrant Phenom suffered a corrupted overclock...',
        'He seized the central socket and now commands an army of Spider-Bots and armored Sentinels.',
        'Tip: use the Pack [TAB / I] to manage wires and repair integrity with thermal paste!',
        'Defeat the sentinels in the I/O Hangar to drop the high-voltage barrier. May your cycles stay stable!'
      ],
      new THREE.Vector3(6, 0, 22),
      false
    );

    new TransistorNPC(
      'bip',
      'Bip the Smith',
      'Hardware & Arsenal Specialist',
      25, -22,
      [
        'Bip bip! Hello, stranger! Need high-conductivity parts?',
        'Bring me copper wires and clock crystals and we can forge devastating weapons at the bench beside me!',
        'The Arc Shotgun and Bus Rifle punch through even the heavy armor on Phenom\'s sentinels.',
        'Watch for wires on the asphalt: pick them up for a steady supply of parts!'
      ],
      new THREE.Vector3(25, 0, -22),
      false,
      gameContext,
      TRADE_STOCK
    );

    new TransistorNPC(
      'volt',
      'Scout Volt',
      'Outer Bus Watch',
      -25, 12,
      [
        'Heads up! Keep low — I heard sentinel footsteps in the north sector!',
        'Phenom Sentinels wear thick copper front shields: do not waste shots from the front! Flank from behind!',
        'Watch the Spider-Bots too: their laser webs snare and slow you, but you can cut them with the knife blade!',
        'If you tame Capdog at the shelter, it will sniff out ambushes and stun enemies with a shock!'
      ],
      new THREE.Vector3(-25, 0, 12),
      false
    );

    new TransistorNPC(
      'ohm',
      'Engineer Ohm',
      'Power Supply & Heatsink Master',
      19, -46,
      [
        'Hello, explorer! Watch the residual heat in these industrial ruins!',
        'We built steel fire escapes on every building: climb to the rooftops for a sightline on the drones!',
        'Use the public forge benches around the metropolis to upgrade your armor!'
      ],
      new THREE.Vector3(19, 0, -46),
      false
    );

    // ==========================================
    // 2. TIPO B: NPCS ANDARILHOS REATIVOS (Civis & Patrulheiros)
    // ==========================================
    new TransistorNPC(
      'flux',
      'Ranger Flux',
      'Civilian Explorer',
      -6, 26,
      [
        'Hi! I am patrolling the avenue looking for fallen copper wires.',
        'If you spot a Sentinel, shout! My armor cannot take three hits from that plasma cannon!'
      ],
      new THREE.Vector3(6, 0, 22),
      true
    );

    new TransistorNPC(
      'nano',
      'Citizen Nano',
      'Bus Messenger',
      35, 15,
      [
        'Racing the clock! Crystal deliveries cannot stop!',
        'Have you tried the Pack [TAB]? It is essential for sorting components before a fight!'
      ],
      new THREE.Vector3(25, 0, -22),
      true
    );

    new TransistorNPC(
      'spark',
      'Allied Sentinel Spark',
      'Ruin Defender',
      -45, -20,
      [
        'Keep your weapons ready! The silicon jungle is getting restless.',
        'Rooftops hide rare chests and great vantage points to pick off robots at range!'
      ],
      new THREE.Vector3(-25, 0, 12),
      true
    );

    new TransistorNPC(
      'kilo',
      'Scavenger Kilo',
      'Urban Scrap Collector',
      15, 68,
      [
        'I found several copper coils near the overturned cars!',
        'Press [E] on wires on the ground to pick them up!'
      ],
      new THREE.Vector3(12, 0, 18),
      true
    );

    // ==========================================
    // 3. BANCADAS DE CRAFTING EM LOCAIS 100% LIVRES
    // ==========================================
    // 1. Praça Central (Hub Seguro do Jogador)
    TransistorNPC.createWorkbench(14, 22, -0.3, gameContext);
    // 2. Entrada da Loja de Hardware
    TransistorNPC.createWorkbench(28, -20, Math.PI / 2, gameContext);
    // 3. Área Externa da Oficina de Robótica
    TransistorNPC.createWorkbench(22, -48, 0, gameContext);
    // 4. Boulevard Leste (Mercado Público)
    TransistorNPC.createWorkbench(52, 22, -Math.PI / 2, gameContext);
  }
}
