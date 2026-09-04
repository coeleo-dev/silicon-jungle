# Contributing to The Silicon Jungle

Thanks for taking the time. This document is the contract for pull requests.

## What this repo is

A **vanilla ES-module** Three.js game. There is **no bundler**, no npm runtime dependency, and no framework. The playground must keep running in a browser from a static HTTP server.

## Run the game

```bash
python3 serve.py
```

Open [http://localhost:4321](http://localhost:4321). Use `serve.py` while changing `js/` — the stock `http.server` caches modules aggressively.

## Tests

Node.js **18+** (CI uses 22).

```bash
npm test
# equivalent:
node --test 'js/**/*.test.mjs'
```

Tests live next to the code they cover (`foo.js` → `foo.test.mjs`). Prefer **pure domain** tests that do not need Three.js, canvas, or the DOM — see [docs/mundo-aberto/arquitetura.md](docs/mundo-aberto/arquitetura.md) (Portuguese).

Before you open a PR, run the full suite. In particular:

- `js/core/noDebugIngest.test.mjs` — game code must not mention port `7736` or debug ingest URLs
- `js/core/moduleStamps.test.mjs` — a given module must share **one** `?v=` stamp across all imports

## Pull request process

1. Fork and branch from the default branch.
2. Keep the change focused. Do not mix refactors with features.
3. Add or extend a `*.test.mjs` when you change rules (combat, save, building, spawn, …).
4. Fill in the PR template. Describe how you ran the game and `npm test`.
5. Wait for CI (`.github/workflows/test.yml`) on GitHub.

## House rules (easy to break)

### One `?v=` per module

Imports look like `from './inventory.js?v=20260912'`. **Different query strings create two ES module instances** (two inventories, two HUDs). If you bump a stamp, bump **every** import of that file in the same change. `moduleStamps.test.mjs` only covers a few names — grep the basename when in doubt.

### UI language vs inventory keys

- HUD, banners, menus, NPC dialogue, and loading copy: **English**
- Inventory / save resource keys: **English** (`pcbFloor`, `copperWires`, …)

Do not translate keys. Keep player-facing copy in English.

### No debug ingest

Do not commit `fetch` to localhost debug collectors, Cursor ingest URLs, or the string `7736` under `js/` (except the forbid-test itself).

### Architecture

New game rules should land in small modules with a clear owner (grid, combat, save, world). `js/main.js` is the composition root — keep orchestration there, not new domain logic. Prefer events from `js/core/events.js` over new hidden globals.

## Suggested workflow for a feature

1. Open an issue (bug or feature template).
2. Implement the smallest testable slice (`*.test.mjs` first when the rule is pure).
3. Play it through `serve.py` if it touches rendering, input, or UI.
4. Open a PR.

## License

Contributions are accepted under the [MIT License](LICENSE).
