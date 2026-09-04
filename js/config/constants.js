/**
 * Constantes e configurações globais do jogo
 */
export const CONFIG = {
  PLAYER: {
    EYE_HEIGHT: 1.8,
    HEIGHT: 1.8,
    RADIUS: 0.45, // Raio físico do player (fonte única — usado por collision.js)
    WALK_SPEED: 11.0,
    SPRINT_SPEED: 20.0,
    OVERCLOCK_MULTIPLIER: 1.75,
    JUMP_VELOCITY: 11.5,
    GRAVITY: 28.0,
    INITIAL_POSITION: { x: 0, y: 1.8, z: 30 }
  },
  WORLD: {
    BOUNDS: 298,
    SKY_COLOR: 0x07111e,       // Céu noturno ciano-marinho profundo estilo Cyberpunk 2077
    SKY_DAY_COLOR: 0x8ecae8,   // Céu diurno PCB claro
    FOG_COLOR: 0x0c2438,       // Neblina um pouco mais ciano, sem ACES
    FOG_NEAR: 38,              // Horizonte um pouco mais perto
    FOG_FAR: 165,              // Silhuetas ainda visíveis, névoa mais densa
    SUN_COLOR: 0x7dd3fc,       // Luar frio azul-celeste vibrante
    SUN_DAY_COLOR: 0xffc98a,   // Chave diurna PCB
    SUN_POS: { x: 80, y: 130, z: 60 },
    DAY_CYCLE_SECONDS: 720
  },
  SURVIVAL: {
    INITIAL_ENERGY: 100,
    INITIAL_INTEGRITY: 100,
    ENERGY_DRAIN_RATE: 0.7,
    INTEGRITY_DRAIN_RATE: 2.5,
    CORE_ENERGY_RESTORE: 45,
    CORE_INTEGRITY_RESTORE: 30
  },
  WEAPONS: {
    KNIFE: {
      ID: 'knife',
      NAME: 'Circuit Knife',
      SLOT: 1,
      DAMAGE: 30,
      RANGE: 2.6,
      COOLDOWN: 0.32,
      ICON: '🔪'
    },
    FLASHLIGHT: {
      ID: 'flashlight',
      NAME: 'Tactical LED Flashlight',
      SLOT: 2,
      RANGE: 60.0,
      ANGLE: Math.PI / 4.0,
      PENUMBRA: 0.45,
      INTENSITY: 3.2,
      COLOR: 0xf8fafc,
      ICON: '🔦'
    },
    PLASMA_PISTOL: {
      ID: 'plasma_pistol',
      NAME: 'Plasma Pistol',
      SLOT: 3,
      DAMAGE: 22,
      SPEED: 80,
      PROJECTILE_SPEED: 80,
      COLOR: 0x00f0ff,
      PROJECTILE_COLOR: 0x00f0ff,
      RANGE: 110,
      MAX_DIST: 110,
      COOLDOWN: 0.42,
      ENERGY_COST: 8,
      BURST_COUNT: 3,
      SPLASH_RADIUS: 2.8,
      HIT_RADIUS: 1.8,
      CAMERA_KICK: 0,
      ICON: '🔫'
    },
    ARC_SHOTGUN: {
      ID: 'arc_shotgun',
      NAME: 'Electric Arc Shotgun',
      SLOT: 4,
      DAMAGE: 14,
      DAMAGE_PER_PELLET: 14,
      PELLETS: 8,
      SPREAD: 0.12,
      HIT_RADIUS: 1.55,
      SPEED: 70,
      PROJECTILE_SPEED: 70,
      COLOR: 0xfbbf24,
      PROJECTILE_COLOR: 0xfbbf24,
      RANGE: 60,
      MAX_DIST: 60,
      COOLDOWN: 0.75,
      ENERGY_COST: 15,
      ICON: '💥'
    },
    BUS_RIFLE: {
      ID: 'bus_rifle',
      NAME: 'PCI Bus Rifle',
      SLOT: 5,
      DAMAGE: 40,
      SPEED: 145,
      PROJECTILE_SPEED: 145,
      COLOR: 0x10b981,
      PROJECTILE_COLOR: 0x10b981,
      RANGE: 180,
      MAX_DIST: 180,
      COOLDOWN: 0.58,
      ENERGY_COST: 7,
      BURST_COUNT: 1,
      SPLASH_RADIUS: 0,
      HIT_RADIUS: 0.9,
      CAMERA_KICK: 0.018,
      ICON: '⚡'
    }
  },
  COMPANION: {
    NAME: 'Capdog',
    SPECIES: 'Cyber Capybara',
    FOLLOW_DISTANCE: 4.5,
    SPEED: 11.5,
    MAX_HEALTH: 150
  },
  COMBAT: {
    PLAYER_MAX_HEALTH: 100,
    PLAYER_MAX_ENERGY: 100,
    ENERGY_REGEN_RATE: 18,
    I_FRAME_DURATION: 0.4
  },
  DIFFICULTY: {
    DEFAULT: 'normal'
  }
};
