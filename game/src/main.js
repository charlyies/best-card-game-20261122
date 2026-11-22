// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between four screens: title, play, win and loss.
//
// ?seed=N fixes the shuffle and the AI. ?shot=start|play|win|lose (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_OVER, EVENT_PLAYED } from './world.js';
import { ACTION_CONFIRM, ACTION_END_TURN, ACTION_MUTE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { computeLayout, createRenderer, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

/** Read-only handle for play-testing: the live state, the screen, the seed. */
window.__ember = {
  world,
  get state() {
    return world.state;
  },
  get screen() {
    return screen;
  },
  seed,
};

let screen = SCREEN_TITLE;
let best = readBest();
let selectedIndex = -1;
let hover = null;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

/** Best result: most damage dealt in a win, or turns survived in a loss. */
function bestValue() {
  const s = world.state;
  if (s.winner === 'player') return s.stats.damageDealt;
  return s.stats.turns;
}

function runShot(name) {
  const scene = stageShot(name, world);
  screen = scene.screen;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, screen, null, -1, 0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function hoverAt(mouse) {
  if (!mouse || mouse.x < 0) return null;
  const layout = computeLayout(world.state);
  for (const rect of layout.hand) {
    if (mouse.x >= rect.x && mouse.x <= rect.x + rect.w && mouse.y >= rect.y - 26 && mouse.y <= rect.y + rect.h) {
      return { index: rect.index };
    }
  }
  const r = layout.endTurn;
  if (mouse.x >= r.x && mouse.x <= r.x + r.w && mouse.y >= r.y && mouse.y <= r.y + r.h) {
    return { endTurn: true };
  }
  return null;
}

function playSelected() {
  const s = world.state;
  if (screen !== SCREEN_PLAY || s.phase !== 'player' || selectedIndex < 0) return;
  const card = s.player.hand[selectedIndex];
  if (!card) {
    selectedIndex = -1;
    return;
  }
  if (s.player.energy < card.def.cost) {
    audio.click();
    return;
  }
  const events = world.playCard('player', selectedIndex);
  selectedIndex = -1;
  if (events & EVENT_PLAYED) {
    const def = card.def;
    if (def.kind === 'attack' || def.id === 'burst' || def.id === 'storm') audio.hit();
    else if (def.kind === 'guard') audio.guard();
    else if (def.kind === 'heal') audio.heal();
    else audio.play();
  }
  if (events & EVENT_OVER) onGameOver();
}

function onGameOver() {
  const s = world.state;
  screen = s.winner === 'player' ? SCREEN_WIN : SCREEN_LOSE;
  if (s.winner === 'player') {
    audio.win();
    const value = bestValue();
    if (value > best) {
      best = value;
      saveBest(best);
    }
  } else {
    audio.lose();
  }
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      world.step(STEP);
      accumulator -= STEP;
    }
    if (world.state.winner && screen === SCREEN_PLAY) onGameOver();

    // Hover follows the mouse.
    hover = hoverAt(input.mouse);

    // One click per frame.
    const click = input.consumeClick();
    if (click) {
      audio.unlock();
      if (screen === SCREEN_TITLE) {
        screen = SCREEN_PLAY;
        audio.play();
      } else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
        world.reset();
        screen = SCREEN_PLAY;
        selectedIndex = -1;
      } else if (screen === SCREEN_PLAY) {
        const hit = hoverAt(click);
        if (hit && hit.endTurn) {
          world.endPlayerTurn();
          audio.click();
          selectedIndex = -1;
        } else if (hit && typeof hit.index === 'number') {
          if (selectedIndex === hit.index) playSelected();
          else {
            selectedIndex = hit.index;
            audio.click();
          }
        } else {
          selectedIndex = -1;
        }
      }
    }

    // One key per frame.
    const key = input.consumeKey();
    if (key) {
      audio.unlock();
      if (key === ACTION_MUTE) {
        const muted = audio.toggleMute();
        status.textContent = muted ? 'Sound off' : 'Sound on';
      } else if (key === ACTION_RESTART && (screen === SCREEN_WIN || screen === SCREEN_LOSE)) {
        world.reset();
        screen = SCREEN_PLAY;
        selectedIndex = -1;
      } else if (key === ACTION_CONFIRM) {
        if (screen === SCREEN_TITLE) {
          screen = SCREEN_PLAY;
          audio.play();
        } else if (screen === SCREEN_PLAY) {
          playSelected();
        }
      } else if (key === ACTION_END_TURN && screen === SCREEN_PLAY) {
        world.endPlayerTurn();
        audio.click();
        selectedIndex = -1;
      } else if (key.startsWith('card') && screen === SCREEN_PLAY) {
        const idx = Number(key.slice(4)) - 1;
        if (idx >= 0 && idx < world.state.player.hand.length) {
          selectedIndex = idx;
          audio.click();
        }
      }
    }

    renderer.draw(world.state, screen, hover, selectedIndex, best);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
