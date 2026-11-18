// Keyboard + mouse input. Tracks held keys, edge-triggered presses, and the
// mouse position in screen space. The game reads this, never the DOM directly.
export const keys = {};
export const pressed = {}; // edge-triggered, consumed by the game each frame
export const mouse = { x: 0, y: 0, down: false, clicked: false };

const CODE_MAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'brake',
  KeyE: 'interact',
  KeyM: 'missions',
  KeyP: 'pause', Escape: 'pause',
  KeyR: 'reload',
};

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const action = CODE_MAP[e.code];
    if (action) {
      if (!keys[action]) pressed[action] = true;
      keys[action] = true;
      if (['up', 'down', 'left', 'right', 'brake'].includes(action)) e.preventDefault();
    }
    if (e.code === 'F1') { pressed.mute = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const action = CODE_MAP[e.code];
    if (action) keys[action] = false;
  });
  window.addEventListener('blur', () => { for (const k of Object.keys(keys)) keys[k] = false; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function endFrame() {
  for (const k of Object.keys(pressed)) pressed[k] = false;
  mouse.clicked = false;
}
