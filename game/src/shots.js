// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the
// real rules forward from a fresh world, steered by an autopilot that picks
// the best card by the same scoring the AI uses, so every frame is what a
// short game really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_TURNS = 6;
const LIMIT_TURNS = 40;
const SIM_STEP = STEP;

/** Play one full player turn with the given pilot style, then end it.
 * `maxPlays` caps the player's cards this turn and `maxAiPlays` the AI's
 * (both uncapped in the win/lose scenes; capped at 1 in the play scene so
 * the staged table still holds a readable hand on both sides). */
function playPlayerTurn(world, style, maxPlays, maxAiPlays) {
  const s = world.state;
  let guard = 0;
  while (s.phase === 'player' && !s.winner && guard < (maxPlays || 20)) {
    const idx = world.bestCardIndex('player', style);
    if (idx === -1) break;
    world.playCard('player', idx);
    guard += 1;
  }
  if (s.phase === 'player' && !s.winner) world.endPlayerTurn(maxAiPlays);
  // Let the AI finish its turn.
  guard = 0;
  while (s.phase === 'ai' && !s.winner && guard < 20000) {
    world.step(SIM_STEP);
    guard += 1;
  }
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best score to show. Any unknown name is the title scene.
 */
export function stageShot(name, world) {
  world.reset();
  const s = world.state;
  // A staged frame shows the table, not transients: clear floating numbers
  // and any screen shake the last play left behind.
  const settle = () => {
    s.floats.length = 0;
    s.shake = 0;
  };
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    settle();
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const style = name === 'lose' ? 'passive' : 'aggressive';
  if (name === 'play') {
    // Five rounds, one card a side per turn: the table shows full hands,
    // moved life totals and real discard piles at the start of turn 6.
    let guard = 0;
    while (!s.winner && s.turn < PLAY_TURNS && guard < 10) {
      playPlayerTurn(world, 'balanced', 1, 1);
      guard += 1;
    }
    settle();
    return { screen: SCREEN_PLAY, best: 0 };
  }
  const targetTurn = LIMIT_TURNS;
  let guard = 0;
  while (!s.winner && s.turn <= targetTurn && guard < LIMIT_TURNS + 2) {
    playPlayerTurn(world, style);
    guard += 1;
  }
  const won = s.winner === 'player';
  if (name === 'win') {
    // If the aggressive pilot did not win on this seed, keep duelling: the
    // win scene must show a real victory.
    guard = 0;
    while (!s.winner && guard < 30) {
      playPlayerTurn(world, 'aggressive');
      guard += 1;
    }
  }
  const over = s.winner !== null;
  settle();
  return { screen: over ? (won ? SCREEN_WIN : SCREEN_LOSE) : SCREEN_PLAY, best: 0 };
}
