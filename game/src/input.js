// Keyboard and pointer input. Held arrow keys give a walk direction; one-shot
// presses (start, pause, shortcuts) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted
// twice. Pointer clicks are reported with playfield coordinates.
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SHORTCUTS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'KeyC', 'KeyF']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let actions = 0;
  let click = null;
  let shortcut = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SHORTCUTS.has(event.code)) {
      if (!event.repeat) shortcut = event.code;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  window.addEventListener('blur', () => { left = false; right = false; });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    click = { x: (event.clientX - rect.left - ox) / scale, y: (event.clientY - rect.top - oy) / scale };
    actions |= ACTION_CONFIRM;
  });

  return {
    direction() { return (right ? 1 : 0) - (left ? 1 : 0); },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    takeShortcut() {
      const taken = shortcut;
      shortcut = null;
      return taken;
    },
  };
}
