// Ember Duel — the rules. Two fighters, 30 life each, take turns playing
// cards from a shared 24-card pool. Attack deals damage, Guard banks block
// that absorbs damage, Heal restores life, Ember cards combine two effects.
// Energy grows each turn (3, then +1 to a cap of 10); one card is drawn each
// turn. The first side to 0 life loses.
import { CARD_DEFS, KIND, MAX_HAND, START_HAND, START_LIFE, STEP, energyForTurn } from './config.js';
import { buildDeck, cardDef, resetCardUids } from './cards.js';

export const EVENT_OVER = 1;
export const EVENT_PLAYED = 2;

const AI_DELAY = 0.85;
const FLOAT_LIFE = 1.1;

/** One side of the table: life, block, energy, deck, hand, discard pile. */
function makeSide(random) {
  return {
    life: START_LIFE,
    block: 0,
    energy: 0,
    deck: buildDeck(random),
    hand: [],
    discard: [],
  };
}

export function createWorld(random) {
  const world = {
    random,
    state: null,
    reset,
    step,
    drawCards,
    canPlay,
    playCard,
    endPlayerTurn,
    bestCardIndex,
  };

  function freshState() {
    resetCardUids();
    const state = {
      turn: 1,
      phase: 'player',
      player: makeSide(random),
      foe: makeSide(random),
      log: [],
      floats: [],
      playedPlayer: null,
      playedFoe: null,
      winner: null,
      aiPlan: [],
      aiTimer: 0,
      stats: { cardsPlayed: 0, damageDealt: 0, turns: 0 },
      shake: 0,
      time: 0,
    };
    return state;
  }

  function reset() {
    world.state = freshState();
    const s = world.state;
    drawCards(s.player, START_HAND);
    drawCards(s.foe, START_HAND);
    s.player.energy = energyForTurn(1);
    s.foe.energy = energyForTurn(1);
    addLog(s, 'Duel begins. Play a card, then end turn.');
  }

  function addLog(s, text) {
    s.log.push(text);
    if (s.log.length > 6) s.log.shift();
  }

  /** Where a floating number appears: beside the side it concerns, in the
   * free strip left of the table (never over the hands or the cards). */
  function floatAnchor(sideName) {
    return sideName === 'player' ? { x: 200, y: 712 } : { x: 200, y: 132 };
  }

  function addFloat(s, x, y, text, color) {
    s.floats.push({ x, y, text, color, t: 0, life: FLOAT_LIFE });
  }

  /** Draw n cards; reshuffles the discard pile when the deck runs dry. */
  function drawCards(side, n) {
    for (let i = 0; i < n; i += 1) {
      if (side.hand.length >= MAX_HAND) return;
      if (side.deck.length === 0) {
        if (side.discard.length === 0) return;
        side.deck = side.discard;
        side.discard = [];
        for (let a = side.deck.length - 1; a > 0; a -= 1) {
          const b = Math.floor(world.random() * (a + 1));
          const tmp = side.deck[a];
          side.deck[a] = side.deck[b];
          side.deck[b] = tmp;
        }
      }
      side.hand.push(side.deck.pop());
    }
  }

  function canPlay(side, card) {
    return side.energy >= card.def.cost;
  }

  /** Deal damage to a side: block absorbs first, the rest hits life. */
  function dealDamage(s, target, amount, from) {
    const absorbed = Math.min(target.block, amount);
    target.block -= absorbed;
    const dealt = amount - absorbed;
    target.life = Math.max(0, target.life - dealt);
    if (from === 'player') s.stats.damageDealt += dealt;
    if (dealt > 0) s.shake = Math.min(10, 4 + dealt);
    return dealt;
  }

  /**
   * Play the card at handIndex for `side` ('player' | 'foe').
   * Returns EVENT_PLAYED, plus EVENT_OVER when the duel ends.
   */
  function playCard(sideName, handIndex) {
    const s = world.state;
    if (s.phase === 'over') return 0;
    const side = sideName === 'player' ? s.player : s.foe;
    const other = sideName === 'player' ? s.foe : s.player;
    const card = side.hand[handIndex];
    if (!card || !canPlay(side, card)) return 0;
    side.energy -= card.def.cost;
    side.hand.splice(handIndex, 1);
    side.discard.push(card);
    s.stats.cardsPlayed += 1;
    const def = card.def;
    let events = EVENT_PLAYED;
    const who = sideName === 'player' ? 'You' : 'Cinder';
    if (sideName === 'player') s.playedPlayer = card;
    else s.playedFoe = card;

    if (def.kind === KIND.ATTACK || def.id === 'burst' || def.id === 'storm') {
      const dealt = dealDamage(s, other, def.value, sideName);
      const at = floatAnchor(sideName === 'player' ? 'foe' : 'player');
      addFloat(s, at.x, at.y, `-${dealt}`, '#ff6b6b');
      addLog(s, `${who} played ${def.name} — ${dealt} dmg.`);
    }
    if (def.kind === KIND.GUARD || def.id === 'storm') {
      const gain = def.id === 'storm' ? 4 : def.value;
      side.block += gain;
      const at = floatAnchor(sideName);
      addFloat(s, at.x, at.y, `+${gain} block`, '#7db4ff');
      if (def.kind === KIND.GUARD) addLog(s, `${who} played ${def.name} — +${gain} block.`);
    }
    if (def.kind === KIND.HEAL) {
      side.life = Math.min(START_LIFE, side.life + def.value);
      const at = floatAnchor(sideName);
      addFloat(s, at.x, at.y, `+${def.value} life`, '#7be495');
      addLog(s, `${who} played ${def.name} — +${def.value} life.`);
    }
    if (def.id === 'burst' || def.id === 'surge') {
      drawCards(side, 1);
      addLog(s, who === 'You' ? 'You draw a card.' : 'Cinder draws a card.');
    }
    if (def.id === 'surge') {
      side.energy += 2;
      const at = floatAnchor(sideName);
      addFloat(s, at.x, at.y, '+2 energy', '#f2c94c');
      addLog(s, `${who} played Ember Surge — +2 energy.`);
    }
    if (other.life <= 0 || side.life <= 0) {
      s.phase = 'over';
      s.winner = other.life <= 0 ? sideName : sideName === 'player' ? 'foe' : 'player';
      addLog(s, s.winner === 'player' ? 'Cinder falls. Victory!' : 'Your ember fades. Defeat.');
      events |= EVENT_OVER;
    }
    return events;
  }

  /**
   * Score a card for the side holding it. Attacks are worth their damage,
   * guards and heals more when life is low, Ember cards for their combo.
   * `style` nudges the pilot: 'aggressive' overvalues damage, 'passive'
   * refuses to attack at all.
   */
  function scoreCard(side, other, card, style) {
    const def = card.def;
    let score = 0;
    if (def.kind === KIND.ATTACK) {
      if (style === 'passive') return -100;
      score = def.value * (style === 'aggressive' ? 2.2 : 1.4);
      if (other.life <= def.value) score += 50;
    } else if (def.kind === KIND.GUARD) {
      score = def.value * (side.life <= 14 ? 1.6 : 0.8);
      if (other.hand.length === 0) score -= 5;
    } else if (def.kind === KIND.HEAL) {
      score = side.life >= START_LIFE ? -10 : def.value * (side.life <= 12 ? 2.0 : 1.0);
    } else {
      score = def.value * 1.5 + 3;
      if (def.id === 'surge' && side.hand.length <= 2) score += 8;
    }
    score -= def.cost * 1.5;
    return score;
  }

  /** Index of the best playable card for a side, or -1 when none is worth it. */
  function bestCardIndex(sideName, style) {
    const s = world.state;
    const side = sideName === 'player' ? s.player : s.foe;
    const other = sideName === 'player' ? s.foe : s.player;
    let best = -1;
    let bestScore = 0.5;
    for (let i = 0; i < side.hand.length; i += 1) {
      const card = side.hand[i];
      if (!canPlay(side, card)) continue;
      const score = scoreCard(side, other, card, style || 'balanced');
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  /** End the player's turn: the AI plans its plays, then plays them.
   * `maxAiPlays` caps how many cards the AI commits this turn (the live
   * game leaves it uncapped; the screenshot pilot caps it at 1 so the
   * staged table still shows a hand worth looking at). */
  function endPlayerTurn(maxAiPlays) {
    const s = world.state;
    if (s.phase !== 'player' || s.winner) return;
    s.phase = 'ai';
    s.aiPlan = [];
    s.aiTimer = 0.4;
    // Plan the AI's turn up front: keep playing its best card while it can.
    const foe = s.foe;
    const simEnergy = foe.energy;
    let energy = simEnergy;
    const handCopy = foe.hand.slice();
    while (true) {
      let best = -1;
      let bestScore = 0.5;
      for (let i = 0; i < handCopy.length; i += 1) {
        const card = handCopy[i];
        if (card.def.cost > energy) continue;
        const score = scoreCard(foe, s.player, card, 'balanced');
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      }
      if (best === -1) break;
      energy -= handCopy[best].def.cost;
      s.aiPlan.push(handCopy[best].uid);
      handCopy.splice(best, 1);
      if (s.aiPlan.length >= (maxAiPlays || Infinity)) break;
    }
  }

  /** Start a fresh player turn after the AI has finished. */
  function startPlayerTurn() {
    const s = world.state;
    s.turn += 1;
    s.stats.turns += 1;
    s.player.block = 0;
    s.foe.block = 0;
    s.player.energy = energyForTurn(s.turn);
    s.foe.energy = energyForTurn(s.turn);
    drawCards(s.player, 1);
    drawCards(s.foe, 1);
    s.phase = 'player';
    addLog(s, `Turn ${s.turn} — ${s.player.energy} energy. Your move.`);
  }

  /** Advance timers, floats and the AI's turn. One fixed step per call. */
  function step(dt) {
    const s = world.state;
    if (!s) return;
    s.time += dt;
    s.shake = Math.max(0, s.shake - dt * 26);
    for (let i = s.floats.length - 1; i >= 0; i -= 1) {
      const f = s.floats[i];
      f.t += dt;
      f.y -= dt * 34;
      if (f.t >= f.life) s.floats.splice(i, 1);
    }
    if (s.phase === 'ai' && !s.winner) {
      s.aiTimer -= dt;
      if (s.aiTimer <= 0) {
        if (s.aiPlan.length > 0) {
          const uid = s.aiPlan.shift();
          const idx = s.foe.hand.findIndex((c) => c.uid === uid);
          if (idx !== -1) playCard('foe', idx);
          s.aiTimer = AI_DELAY;
          if (s.winner) return;
        } else {
          startPlayerTurn();
        }
      }
    }
  }

  reset();
  return world;
}
