# Gobble Dash — The Great Turkey Escape

[![make.fun · turkey-run-game-01](https://make.fun/badge/turkey-run-game-01.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![rank](https://make.fun/badge/turkey-run-game-01/suoyawangluo/turkey-run-game-01/rank.svg)](https://make.fun/bounty/turkey-run-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)
[![reward](https://make.fun/badge/turkey-run-game-01/suoyawangluo/turkey-run-game-01/reward.svg)](https://make.fun/bounty/turkey-run-game-01?utm_source=github&utm_medium=readme&utm_campaign=turkey-run-game-01)

Thanksgiving is coming. The farmer is coming faster. **Gobble Dash** is a complete 2D
turkey escape game that plays offline in a desktop browser from its own static files:
a turkey sprints 1200 metres from the farmyard, through the barn, across the kitchen
and out the back door — chased the whole way by a very cross farmer with a pitchfork.

## How it plays

- **Run** — the world scrolls; distance, score and lives are on the HUD.
- **Jump** (SPACE / ↑ / W / click, double jump in the air) over fences, hay bales and
  the kitchen oven.
- **Slide** (S / ↓) under clotheslines.
- **Dodge** the carving knives — some spin on the ground, some fall from the sky in
  the kitchen.
- **Hide** (H) in a haystack when one is near: the farmer loses your trail.
- **Collect** corn (+10) and golden feathers (+50, +1 life, farmer falls back).
- **Stumble** and the farmer gains ground. Three lives, or one grab, and you are
  Thanksgiving dinner. Reach 1200m and you escape.

Three stages grow harder as you go: the farmyard, the barn, the kitchen. Sounds are
synthesized live with the Web Audio API (M to mute, P to pause, R to restart).
All art is drawn in code — no image or audio files, no network requests.

## Play it

Serve `game/` with any static server and open `game/index.html`, for example:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with `buildDossier` from
`vendor/makefun-game.ts`:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Built for the [make.fun turkey escape game bounty](https://make.fun/bounty/turkey-run-game-01).
