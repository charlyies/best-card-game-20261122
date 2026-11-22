// Ember Duel — the canvas renderer. One fixed 1280x720 logical table, scaled
// to the window. The table always shows both hands, both life totals, energy,
// decks and discard piles in a single frame; title, win and loss screens are
// overlays over the same table.
import { CARD_H, CARD_W, FIELD, FOE_CARD_H, FOE_CARD_W, KIND_STYLE, PALETTE, START_LIFE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const HAND_Y = 500;
const HAND_CARD_W = 132;
const HAND_CARD_H = 182;
const FOE_HAND_Y = 120;

/** Rounded-rectangle path helper. */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draw a kind glyph (sword / shield / plus / flame) centred at (cx, cy). */
function drawGlyph(ctx, glyph, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (glyph === 'sword') {
    // A broad diagonal blade with a crossguard and a grip.
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.3, cy + size * 0.34);
    ctx.lineTo(cx + size * 0.2, cy - size * 0.16);
    ctx.lineTo(cx + size * 0.44, cy - size * 0.4);
    ctx.lineTo(cx + size * 0.5, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.4, cy - size * 0.44);
    ctx.lineTo(cx - size * 0.16, cy + size * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.34, cy + size * 0.14);
    ctx.lineTo(cx - size * 0.14, cy + size * 0.34);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.3, cy + size * 0.34);
    ctx.lineTo(cx - size * 0.46, cy + size * 0.5);
    ctx.stroke();
  } else if (glyph === 'shield') {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.5);
    ctx.lineTo(cx + size * 0.42, cy - size * 0.28);
    ctx.lineTo(cx + size * 0.38, cy + size * 0.12);
    ctx.quadraticCurveTo(cx + size * 0.3, cy + size * 0.5, cx, cy + size * 0.52);
    ctx.quadraticCurveTo(cx - size * 0.3, cy + size * 0.5, cx - size * 0.38, cy + size * 0.12);
    ctx.lineTo(cx - size * 0.42, cy - size * 0.28);
    ctx.closePath();
    ctx.fill();
  } else if (glyph === 'plus') {
    const t = size * 0.26;
    ctx.fillRect(cx - t / 2, cy - size * 0.5, t, size);
    ctx.fillRect(cx - size * 0.5, cy - t / 2, size, t);
  } else {
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.52);
    ctx.bezierCurveTo(cx + size * 0.34, cy - size * 0.1, cx + size * 0.42, cy + size * 0.18, cx + size * 0.2, cy + size * 0.4);
    ctx.bezierCurveTo(cx + size * 0.08, cy + size * 0.52, cx - size * 0.08, cy + size * 0.52, cx - size * 0.2, cy + size * 0.4);
    ctx.bezierCurveTo(cx - size * 0.42, cy + size * 0.18, cx - size * 0.3, cy - size * 0.08, cx, cy - size * 0.52);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Wrap text to fit a width; returns the lines. */
function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Where everything sits. main.js uses the same rects for click hit-testing,
 * so the picture and the input can never disagree.
 */
export function computeLayout(state) {
  const layout = { hand: [], foeHand: [], endTurn: { x: 1060, y: 636, w: 196, h: 60 } };
  const n = state.player.hand.length;
  const spacing = n <= 1 ? 0 : Math.min(140, (700 - HAND_CARD_W) / (n - 1));
  const total = n * HAND_CARD_W - (n - 1) * (HAND_CARD_W - spacing);
  // Keep the hand clear of the player portrait box (ends x=324) and the
  // End Turn button (starts x=1060).
  let x = Math.max(336, 640 - total / 2 + 10);
  for (let i = 0; i < n; i += 1) {
    layout.hand.push({ x, y: HAND_Y, w: HAND_CARD_W, h: HAND_CARD_H, index: i });
    x += spacing;
  }
  const m = state.foe.hand.length;
  const foeSpacing = m <= 1 ? 0 : Math.min(112, (700 - FOE_CARD_W) / (m - 1));
  const foeTotal = m * FOE_CARD_W - (m - 1) * (FOE_CARD_W - foeSpacing);
  let fx = 640 - foeTotal / 2;
  for (let i = 0; i < m; i += 1) {
    layout.foeHand.push({ x: fx, y: FOE_HAND_Y, w: FOE_CARD_W, h: FOE_CARD_H, index: i });
    fx += foeSpacing;
  }
  return layout;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function drawTable() {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, '#223626');
    grad.addColorStop(0.5, PALETTE.felt);
    grad.addColorStop(1, '#16211a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.tableLine;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(640, 360, 600, 330, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.16)';
    ctx.lineWidth = 10;
    ctx.strokeRect(6, 6, FIELD.width - 12, FIELD.height - 12);
  }

  function drawLifeBar(x, y, w, life, block, alignRight) {
    ctx.fillStyle = '#101010';
    roundRect(ctx, x, y, w, 18, 9);
    ctx.fill();
    const frac = Math.max(0, life / START_LIFE);
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#ff8a5c');
    grad.addColorStop(1, '#e5534b');
    ctx.fillStyle = grad;
    if (frac > 0) {
      roundRect(ctx, x + 1, y + 1, Math.max(10, (w - 2) * frac), 16, 8);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${life} / ${START_LIFE}`, alignRight ? x + w : x, y + 30);
    if (block > 0) {
      ctx.fillStyle = '#7db4ff';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(`${block} BLOCK`, alignRight ? x + w - 90 : x + 110, y + 30);
    }
    ctx.textAlign = 'left';
  }

  function drawPortrait(state, sideName) {
    const isFoe = sideName === 'foe';
    const side = isFoe ? state.foe : state.player;
    const x = isFoe ? 24 : 24;
    const y = isFoe ? 14 : 600;
    ctx.fillStyle = 'rgba(20, 14, 10, 0.72)';
    roundRect(ctx, x, y, 300, 96, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, 300, 96, 10);
    ctx.stroke();
    ctx.fillStyle = isFoe ? '#e58aa5' : PALETTE.gold;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(isFoe ? 'CINDER — ASH WARDEN' : 'YOU — EMBER KNIGHT', x + 14, y + 26);
    drawLifeBar(x + 14, y + 38, 272, side.life, side.block, false);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px system-ui, sans-serif';
    const energy = '●'.repeat(side.energy) + '○'.repeat(Math.max(0, 10 - side.energy));
    ctx.fillText(`Energy ${energy}   Deck ${side.deck.length} · Discard ${side.discard.length}`, x + 14, y + 84);
  }

  function drawCardBack(x, y, w, h, label) {
    ctx.fillStyle = PALETTE.cardBack;
    roundRect(ctx, x, y, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ember;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.stroke();
    drawGlyph(ctx, 'flame', x + w / 2, y + h / 2 - 6, Math.min(w, h) * 0.42, PALETTE.ember);
    if (label) {
      ctx.fillStyle = PALETTE.text;
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y + h - 16);
      ctx.textAlign = 'left';
    }
  }

  function drawCardFace(card, x, y, w, h, opts) {
    const style = KIND_STYLE[card.def.kind];
    const selected = opts && opts.selected;
    const dimmed = opts && opts.dimmed;
    const compact = opts && opts.compact;
    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.45;
    ctx.fillStyle = PALETTE.cardFace;
    roundRect(ctx, x, y, w, h, 9);
    ctx.fill();
    ctx.strokeStyle = selected ? PALETTE.gold : style.color;
    ctx.lineWidth = selected ? 4 : 2.5;
    roundRect(ctx, x, y, w, h, 9);
    ctx.stroke();
    // Kind band with the name.
    const bandH = compact ? 24 : 34;
    ctx.fillStyle = style.color;
    roundRect(ctx, x, y, w, bandH, 9);
    ctx.fill();
    ctx.fillRect(x, y + bandH - 10, w, 10);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${compact ? 9 : w >= 140 ? 12 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(card.def.name.toUpperCase(), x + (compact ? 26 : 34), y + (compact ? 16 : 23));
    // Cost gem, top-left over the band.
    const gemR = compact ? 10 : 14;
    const gemX = x + (compact ? 12 : 17);
    const gemY = y + (compact ? 12 : 17);
    ctx.fillStyle = '#241a12';
    ctx.beginPath();
    ctx.arc(gemX, gemY, gemR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold ${compact ? 12 : 17}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(card.def.cost), gemX, gemY + (compact ? 4 : 6));
    ctx.textAlign = 'left';
    // Big value + glyph in the middle.
    const cy = y + h * (compact ? 0.48 : 0.46);
    drawGlyph(ctx, style.glyph, x + w / 2, cy - 6, compact ? 26 : 46, style.color);
    ctx.fillStyle = PALETTE.cardInk;
    ctx.font = `bold ${compact ? 22 : 34}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(String(card.def.value), x + w / 2, cy + (compact ? 28 : 40));
    ctx.textAlign = 'left';
    if (!compact) {
      // Effect text.
      ctx.fillStyle = '#4a3a28';
      ctx.font = `${w >= 140 ? 13 : 11}px system-ui, sans-serif`;
      const lines = wrapText(ctx, card.def.text, w - 20);
      lines.forEach((line, i) => {
        ctx.fillText(line, x + 10, y + h - 44 + i * 15);
      });
    }
    // Kind footer.
    ctx.fillStyle = style.dark;
    ctx.font = `bold ${compact ? 9 : 11}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(style.label, x + w / 2, y + h - 10);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawPile(x, y, w, h, count, topCard, label) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x + 3, y + 3, w, h, 8);
    ctx.fill();
    if (topCard) drawCardFace(topCard, x, y, w, h, { compact: true });
    else drawCardBack(x, y, w, h, '');
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${label} ${count}`, x + w / 2, y + h + 16);
    ctx.textAlign = 'left';
  }

  function drawLog(state) {
    ctx.fillStyle = 'rgba(20, 14, 10, 0.6)';
    roundRect(ctx, 24, 300, 280, 176, 10);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('DUEL LOG', 38, 322);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12.5px system-ui, sans-serif';
    state.log.slice(-5).forEach((line, i) => {
      ctx.fillText(line, 38, 346 + i * 26);
    });
  }

  function drawEndTurn(state, hover) {
    const r = { x: 1060, y: 636, w: 196, h: 60 };
    const active = state.phase === 'player' && !state.winner;
    ctx.fillStyle = active ? (hover ? '#d2691e' : PALETTE.button) : '#3a3230';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = active ? PALETTE.buttonEdge : '#555';
    ctx.lineWidth = 2;
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.stroke();
    ctx.fillStyle = active ? '#fff' : '#888';
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.phase === 'ai' ? 'CINDER…' : 'END TURN', r.x + r.w / 2, r.y + 38);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('or press Space', r.x + r.w / 2, r.y - 8);
    ctx.textAlign = 'left';
  }

  function drawBanner(state) {
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const text = state.phase === 'ai'
      ? `TURN ${state.turn} — CINDER IS PLAYING…`
      : `TURN ${state.turn} — YOUR MOVE · ${state.player.energy} ENERGY`;
    ctx.fillText(text, 640, 292);
    ctx.textAlign = 'left';
  }

  function drawFloats(state) {
    for (const f of state.floats) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - f.t / f.life);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 4;
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillText(f.text, f.x, f.y);
      ctx.restore();
    }
    ctx.textAlign = 'left';
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 7, 5, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 340, 110, 600, 500, 16);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundRect(ctx, 340, 110, 600, 500, 16);
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = 'bold 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, 640, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '19px system-ui, sans-serif';
    lines.forEach((line, i) => {
      ctx.fillText(line, 640, 240 + i * 30);
    });
    ctx.textAlign = 'left';
  }

  function draw(state, screen, hover, selectedIndex, best) {
    ctx.save();
    if (state.shake > 0.5) {
      const t = state.time * 47;
      ctx.translate(Math.sin(t) * state.shake * 0.4, Math.cos(t * 1.3) * state.shake * 0.4);
    }
    drawTable();
    const layout = computeLayout(state);
    // Opponent: portrait, face-down hand, deck + discard.
    drawPortrait(state, 'foe');
    for (const rect of layout.foeHand) {
      drawCardBack(rect.x, rect.y, rect.w, rect.h, '');
    }
    drawPile(1150, 92, 96, 134, state.foe.deck.length, null, 'DECK');
    drawPile(1030, 92, 96, 134, state.foe.discard.length, state.foe.discard[state.foe.discard.length - 1] || null, 'DISCARD');
    // Centre: banner, last played cards, log, piles.
    drawBanner(state);
    if (state.playedFoe) drawCardFace(state.playedFoe, 505, 296, CARD_W, CARD_H, {});
    if (state.playedPlayer) drawCardFace(state.playedPlayer, 643, 296, CARD_W, CARD_H, {});
    drawLog(state);
    drawPile(1150, 300, 96, 134, state.player.deck.length, null, 'DECK');
    drawPile(1030, 300, 96, 134, state.player.discard.length, state.player.discard[state.player.discard.length - 1] || null, 'DISCARD');
    // Player: portrait, hand, end-turn button.
    drawPortrait(state, 'player');
    layout.hand.forEach((rect) => {
      const card = state.player.hand[rect.index];
      const isHover = hover && hover.index === rect.index;
      const isSelected = selectedIndex === rect.index;
      const y = rect.y - (isSelected ? 26 : isHover ? 12 : 0);
      const affordable = state.player.energy >= card.def.cost;
      drawCardFace(card, rect.x, y, rect.w, rect.h, { selected: isSelected, dimmed: !affordable && state.phase === 'player' });
      if (isSelected) {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CLICK AGAIN TO PLAY · 1-8 + ENTER', rect.x + rect.w / 2, rect.y - 34);
        ctx.textAlign = 'left';
      }
      if (isHover) {
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`KEY ${rect.index + 1}`, rect.x + rect.w / 2, rect.y + rect.h + 16);
        ctx.textAlign = 'left';
      }
    });
    drawEndTurn(state, hover && hover.endTurn);
    drawFloats(state);

    if (screen === SCREEN_TITLE) {
      drawOverlay('EMBER DUEL', [
        'A turn-based card battler. You are the Ember Knight;',
        'Cinder, the Ash Warden, holds the far side of the table.',
        '',
        'Click a card to select it, click again to play it.',
        'Keys 1-8 select, Enter plays, Space ends your turn.',
        'Attack breaks through block. Guard banks block. Heal',
        'restores life. Ember cards combine two effects at once.',
        'First to 0 life loses. Energy grows every turn.',
        '',
        best > 0 ? `Best result: ${best}` : 'No duels won yet — light your first ember.',
        '',
        'CLICK OR PRESS ENTER TO BEGIN',
      ], PALETTE.ember);
    } else if (screen === SCREEN_WIN) {
      drawOverlay('VICTORY', [
        'Cinder falls. The Ash Warden bows to the Ember Knight.',
        '',
        `Won in ${state.stats.turns} turns · ${state.stats.cardsPlayed} cards played`,
        `Damage dealt: ${state.stats.damageDealt}`,
        '',
        best > 0 ? `Best result: ${best}` : '',
        '',
        'PRESS R OR CLICK TO DUEL AGAIN',
      ], PALETTE.gold);
    } else if (screen === SCREEN_LOSE) {
      drawOverlay('DEFEAT', [
        'Your ember fades. Cinder keeps the table — this time.',
        '',
        `Lasted ${state.stats.turns} turns · ${state.stats.cardsPlayed} cards played`,
        `Damage dealt: ${state.stats.damageDealt}`,
        '',
        'PRESS R OR CLICK TO DUEL AGAIN',
      ], '#c94f6d');
    }
    ctx.restore();
  }

  return { draw };
}
