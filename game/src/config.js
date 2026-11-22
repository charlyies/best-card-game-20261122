// Ember Duel — every tuning number, colour and card definition in one place.
// The table is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

export const START_LIFE = 30;
export const START_HAND = 4;
export const MAX_HAND = 8;
export const MAX_ENERGY = 10;
export const DECK_SIZE = 24;

/** Energy on turn n (1-based): 3, then +1 a turn, capped at 10. */
export function energyForTurn(turn) {
  return Math.min(MAX_ENERGY, 2 + turn);
}

export const CARD_W = 150;
export const CARD_H = 208;
export const FOE_CARD_W = 104;
export const FOE_CARD_H = 146;

/** Card kinds. Colour AND shape tell them apart, never text alone. */
export const KIND = {
  ATTACK: 'attack',
  GUARD: 'guard',
  HEAL: 'heal',
  EMBER: 'ember',
};

export const KIND_STYLE = {
  attack: { color: '#e5534b', dark: '#7a1f1a', label: 'ATTACK', glyph: 'sword' },
  guard: { color: '#4f8ef7', dark: '#173a6e', label: 'GUARD', glyph: 'shield' },
  heal: { color: '#43b581', dark: '#14532d', label: 'HEAL', glyph: 'plus' },
  ember: { color: '#f2994a', dark: '#7a3c08', label: 'EMBER', glyph: 'flame' },
};

/**
 * The card pool. Each entry: id, name, kind, cost, value (damage / block /
 * heal), count in a 24-card deck, and the one-line effect text.
 * Ember cards combine: Cinder Burst draws a card, Spark Storm hits and
 * guards at once, Phoenix Sip heals and kindles energy.
 */
export const CARD_DEFS = [
  { id: 'slash', name: 'Ember Slash', kind: KIND.ATTACK, cost: 1, value: 4, count: 5, text: 'Deal 4 damage.' },
  { id: 'lash', name: 'Flame Lash', kind: KIND.ATTACK, cost: 2, value: 7, count: 3, text: 'Deal 7 damage.' },
  { id: 'inferno', name: 'Inferno', kind: KIND.ATTACK, cost: 3, value: 11, count: 2, text: 'Deal 11 damage.' },
  { id: 'guard', name: 'Ashen Guard', kind: KIND.GUARD, cost: 1, value: 5, count: 4, text: 'Gain 5 block.' },
  { id: 'wall', name: 'Ember Wall', kind: KIND.GUARD, cost: 2, value: 9, count: 2, text: 'Gain 9 block.' },
  { id: 'sip', name: 'Phoenix Sip', kind: KIND.HEAL, cost: 1, value: 3, count: 2, text: 'Restore 3 life.' },
  { id: 'heart', name: 'Kindle Heart', kind: KIND.HEAL, cost: 2, value: 6, count: 2, text: 'Restore 6 life.' },
  { id: 'burst', name: 'Cinder Burst', kind: KIND.EMBER, cost: 2, value: 5, count: 2, text: 'Deal 5 damage. Draw 1 card.' },
  { id: 'storm', name: 'Spark Storm', kind: KIND.EMBER, cost: 3, value: 4, count: 1, text: 'Deal 4 damage. Gain 4 block.' },
  { id: 'surge', name: 'Ember Surge', kind: KIND.EMBER, cost: 0, value: 2, count: 1, text: 'Gain 2 energy. Draw 1 card.' },
];

export const PALETTE = {
  backdrop: '#14100d',
  felt: '#1d2b22',
  feltEdge: '#2c4433',
  feltLight: '#24382b',
  tableLine: '#3a5a44',
  panel: '#221a14',
  panelEdge: '#4a3524',
  text: '#f5ead9',
  muted: '#b8a88f',
  dim: '#7d7264',
  gold: '#f2c94c',
  ember: '#f2994a',
  emberHot: '#ff6b35',
  foe: '#c94f6d',
  player: '#f2994a',
  cardBack: '#2b1a12',
  cardFace: '#f7efdd',
  cardInk: '#241a12',
  button: '#b3541e',
  buttonEdge: '#f2994a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best result is kept between visits (this browser only). */
export const BEST_KEY = 'ember-duel.best';
