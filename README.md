# 🍜 DAPUR KILAT — Warung Rush

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Bradestudio/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Bradestudio/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A fast, complete cooking game built for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). You run a warung kitchen for a 3-minute shift: orders land on the board with a patience bar, and every second counts.

Grab ingredients from the pantry, chop them on the board, cook them on the stove, build the dish on the plate, and ring the serve bell when the plate matches an order. A served dish pays coins plus a speed bonus; an expired order costs a star. Lose all three stars — or run out of time — and the shift ends.

Five original dishes, each with its own recipe:

- **Nasi Goreng** — nasi + telur + sambal — 28 koin
- **Mie Ayam** — mie + ayam + sayur — 32 koin
- **Ayam Geprek** — ayam + sambal + nasi — 36 koin
- **Nasi Telur** — nasi + telur + sayur — 22 koin
- **Mie Goreng** — mie + telur + sayur — 30 koin

Some ingredients are ready at once (nasi, sambal); sayur must be chopped, and mie, ayam and telur must be cooked first. Chain serves without an expiry to build a combo.

## Play

Open `game/index.html` in a desktop browser (or `node serve.ts` and visit http://localhost:8080). No network, no build step, no files outside `game/`.

- **Mouse** — click a pantry bin to grab, a station to chop/cook, the plate to place, the bell to serve
- **1–6** — grab an ingredient · **C** — chop · **F** — cook · **Space** — place / serve
- **← → / A D** — walk the chef · **P / Esc** — pause · **Enter** — start / restart

Win the shift by serving as many orders as you can before the 3-minute timer ends; your best coin total is kept in the browser.

## Shots

`?shot=start|play|serve|end` stages a deterministic scene (fixed seed) for screenshots — see `shots.json`. The autopilot plays the real rules forward, so every screenshot is a genuine render of the game.

## Files

- `game/` — the playable game (static files only)
  - `game/src/config.js` — tuning, dishes, ingredients, palette, zones
  - `game/src/world.js` — the shift: orders, patience, prep, plating, serving, scoring
  - `game/src/render.js` — the kitchen: pantry, board, stove, plate, serve window, order board
  - `game/src/input.js` — keyboard + pointer input
  - `game/src/shots.js` — the four deterministic screenshot scenes
  - `game/src/main.js` — boot, loop, screens, synth sound
- `screenshots/` — 4 real renders of the game's own code
- `main.ts` — the entry program (Node 22, standard library only): copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).

---

Built for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137?ref=qjs4e9sj).
