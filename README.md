# Ember Duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![make.fun · rank](https://make.fun/badge/best-card-game-20261122-1826/charlyies/best-card-game-20261122/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![make.fun · reward](https://make.fun/badge/best-card-game-20261122-1826/charlyies/best-card-game-20261122/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)

A turn-based card battler, built for the [make.fun bounty best-card-game-20261122-1826](https://make.fun/bounty/best-card-game-20261122-1826) — "Make the best card game".

You are the Ember Knight. Across the table sits Cinder, the Ash Warden.
Both of you hold 30 life and a 24-card deck of Attack, Guard, Heal and
Ember cards. Play cards with the mouse or the keyboard, end your turn, and
watch Cinder answer — her cards flip face-up as she plays them. First to
0 life loses.

## How to play

- **Click a card** to select it, **click again** (or press Enter) to play it
- **Keys 1-8** select a hand card, **Enter** plays it
- **Space** or the END TURN button ends your turn
- **M** mutes, **R** restarts after the duel ends
- Attack deals damage (block absorbs it first), Guard banks block, Heal
  restores life, Ember cards combine two effects — Cinder Burst hits and
  draws, Spark Storm hits and guards, Ember Surge kindles energy
- Energy grows every turn (3, then +1 to a cap of 10); you draw a card
  every turn. When your deck runs dry, the discard pile reshuffles

## Run it

Static files only — no build step, no network, no downloads. Serve `game/`
with any static server, or:

```sh
node serve.ts
# open http://localhost:8080
```

`?seed=N` fixes the shuffle and the AI. `?shot=start|play|win|lose&seed=N`
stages a screenshot scene: the same seeded autopilot plays the real rules
forward, so every screenshot is a genuine render of the game.

## Files

- `game/index.html` + `game/src/` — the game (canvas 2D, vanilla JS):
  `config.js` (tuning + card pool), `cards.js` (decks), `world.js`
  (rules + AI), `input.js`, `audio.js` (synthesised WebAudio, no files),
  `render.js` (the table), `shots.js` (autopilot scenes), `main.js` (loop)
- `main.ts` — copies `game/` + `screenshots/` to `/output` and writes the
  dossier with the vendored `vendor/makefun-game.ts`
- `screenshots/` — 4 real renders: the table mid-duel (cover), the title
  screen, the victory screen and the defeat screen
