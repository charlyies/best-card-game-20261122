// Cards and decks. A deck is a plain array of card ids; a card in play is a
// small object { uid, def } so the same definition can sit in two decks.
import { CARD_DEFS, DECK_SIZE } from './config.js';
import { shuffle } from './random.js';

let nextUid = 1;

/** Look a card definition up by id. */
export function cardDef(id) {
  for (const def of CARD_DEFS) {
    if (def.id === id) return def;
  }
  return null;
}

/** Build one fresh 24-card deck from the pool, shuffled by the seeded RNG. */
export function buildDeck(random) {
  const ids = [];
  for (const def of CARD_DEFS) {
    for (let i = 0; i < def.count; i += 1) ids.push(def.id);
  }
  if (ids.length !== DECK_SIZE) throw new Error(`deck is ${ids.length}, expected ${DECK_SIZE}`);
  shuffle(ids, random);
  return ids.map((id) => ({ uid: nextUid, def: cardDef(id) }));
}

/** Reset the uid counter (fresh world per seed). */
export function resetCardUids() {
  nextUid = 1;
}

/** A short, readable label for a card, used by the log and the dossier. */
export function cardLabel(card) {
  return `${card.def.name} (${card.def.cost})`;
}
