# The Silicon Jungle Survival

A first-person 3D survival-action game on an abandoned motherboard overgrown with cyber-jungle. You are miniaturized. **Phenom**, a corrupt CPU with a microcode defect, hunts you with robots.

Vanilla **JavaScript ES modules** + **Three.js r128**. Cel-shaded look, procedural Web Audio SFX, no bundler.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-node%20--test-0a7ea4)](CONTRIBUTING.md#tests)

## Play

The game is static files. Serve the repo over HTTP (file:// will not load ES modules).

**Recommended** — cache-busting server on port **4321**:

```bash
python3 serve.py
```

Open [http://localhost:4321](http://localhost:4321).

Any other static server works (`python3 -m http.server 4321`, `npx serve .`, VS Code Live Server). Prefer `serve.py` while developing: ES module URLs are cache-hostile in the default Python server.

**Requirements:** a current Chromium or Firefox; Python 3 for `serve.py`; **Node.js 18+** only if you run tests.

## Tests

```bash
npm test
# or
node --test 'js/**/*.test.mjs'
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Controls

| Action | Input |
| --- | --- |
| Move | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> |
| Look | Mouse (pointer lock) |
| Attack / fire | Left mouse |
| Interact / collect | <kbd>E</kbd> |
| Weapon slots | <kbd>1</kbd>–<kbd>4</kbd> |
| Cycle weapons | Mouse wheel / <kbd>Q</kbd> |
| Flashlight | <kbd>L</kbd> or <kbd>F</kbd> |
| Sprint | <kbd>Shift</kbd> |
| Jump | <kbd>Space</kbd> |
| Build mode | <kbd>B</kbd> (craft PCB pieces at a workbench first) |
| Pause / cursor | <kbd>Esc</kbd> |

In build mode: scroll cycles piece type, <kbd>R</kbd> yaws, left click places, right click demolishes.

## Features

- PCB world: copper traces, electrolytic capacitors, DIMM spires, I/O hangars, CPU heatsink citadel
- Circuit vegetation: jumper vines, resistor trees, thermal-paste moss
- Toon lighting and a day/night clock with storms
- Arsenal: circuit knife, LED flashlight, plasma pistol, arc shotgun, bus rifle
- Spider-Bots, Phenom sentinels, tameable **Capdog**, **Transistor** NPCs
- Crafting, inventory, player-placed floors/walls/doors/stairs/crates/benches
- Procedural SFX (Web Audio API — no sample pack required)

## Repository layout

```
miniworld-survival/
├── index.html              # Entry HTML, Three.js CDN, HUD markup
├── serve.py                # Dev HTTP server, no-store cache headers, port 4321
├── css/                    # HUD, overlay, inventory, crafting, dialogue, …
├── js/
│   ├── main.js             # Game loop and composition root
│   ├── config/             # Constants, quality, combat balance
│   ├── core/               # Scene, events, save, registries, survival
│   ├── world/              # Terrain, biomes, chunks, structures, weather
│   ├── building/           # Player base grid, catalog, meshes
│   ├── entities/           # Player, inventory, enemies, NPCs, companions
│   ├── combat/             # Damage, LoS, projectiles
│   ├── weapons/            # Weapon system and strategies
│   ├── ui/                 # HUD, menus, compass
│   └── utils/              # Collision, particles, culling
├── docs/                   # Design notes (mostly Portuguese) — see docs/README.md
└── js/**/*.test.mjs        # node:test suites next to the modules they cover
```

Design and architecture notes: [docs/README.md](docs/README.md).

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md). Security reports: [SECURITY.md](SECURITY.md).

Please do not edit the GDD [`docs/visao_futuro_mundo_aberto.md`](docs/visao_futuro_mundo_aberto.md) or [`docs/mundo-aberto/plano_completo.md`](docs/mundo-aberto/plano_completo.md) unless maintainers agree on an issue first.

## License

[MIT](LICENSE). Third-party notices (Three.js, fonts): [NOTICE.md](NOTICE.md).

## Credits

- **Three.js r128** — MIT, loaded from CDN
- **Google Fonts** — Chakra Petch, Orbitron, Share Tech Mono (OFL)
