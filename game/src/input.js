// Mouse + keyboard input, translated into game actions the main loop reads.
// Click a card to select it (it lifts), click it again (or press Enter) to
// play it. Keys 1-8 select a hand card, Space ends the turn, M mutes,
// R restarts after the duel ends, Enter confirms on the title screen.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_END_TURN = 'endTurn';
export const ACTION_MUTE = 'mute';
export const ACTION_RESTART = 'restart';
export const ACTION_PAUSE = 'pause';

export function createInput(canvas) {
  const input = {
    mouse: { x: -1, y: -1, clicked: false, clickX: -1, clickY: -1 },
    keys: [],
    consumeClick,
    consumeKey,
  };
  let clicked = null;
  const keys = [];

  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = toLocal(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
  });
  canvas.addEventListener('click', (event) => {
    const p = toLocal(event);
    input.mouse.x = p.x;
    input.mouse.y = p.y;
    clicked = p;
  });
  canvas.addEventListener('mouseleave', () => {
    input.mouse.x = -1;
    input.mouse.y = -1;
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ') keys.push(ACTION_END_TURN);
    else if (key === 'enter') keys.push(ACTION_CONFIRM);
    else if (key === 'm') keys.push(ACTION_MUTE);
    else if (key === 'r') keys.push(ACTION_RESTART);
    else if (key === 'p' || key === 'escape') keys.push(ACTION_PAUSE);
    else if (/^[1-8]$/.test(key)) keys.push(`card${key}`);
    if ([' ', 'enter'].includes(key)) event.preventDefault();
  });

  function consumeClick() {
    const c = clicked;
    clicked = null;
    return c;
  }

  function consumeKey() {
    return keys.length > 0 ? keys.shift() : null;
  }

  return input;
}
