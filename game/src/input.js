// Aurelia Nights — keyboard and mouse input. The game reads the exported
// `keys` / `pressed` / `mouse` objects and never touches DOM events itself.
// `pressed` is edge-triggered: a tap registers for exactly one frame and is
// cleared by endFrame(), which the main loop calls after every update.
export const keys = {};
export const pressed = {};
export const mouse = { x: 640, y: 360, down: false, clicked: false };

// KeyboardEvent.code -> game action. Arrows mirror WASD.
const BINDINGS = {
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
  KeyH: 'horn',
};

// Keys whose default browser behaviour (page scroll) must be suppressed.
const NO_SCROLL = new Set(['up', 'down', 'left', 'right', 'brake']);

export function initInput(canvas) {
  window.addEventListener('keydown', (e) => {
    const action = BINDINGS[e.code];
    if (action) {
      if (!keys[action]) pressed[action] = true;
      keys[action] = true;
      if (NO_SCROLL.has(action)) e.preventDefault();
    }
    if (e.code === 'F1') {
      pressed.mute = true;
      e.preventDefault();
    }
    if (e.code === 'Enter') pressed.confirm = true;
  });
  window.addEventListener('keyup', (e) => {
    const action = BINDINGS[e.code];
    if (action) keys[action] = false;
  });
  // Losing the window must never leave a key stuck down.
  window.addEventListener('blur', releaseAll);
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouse.down = true;
      mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    mouse.down = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// Release every held key (window blur, pause, etc).
export function releaseAll() {
  for (const k of Object.keys(keys)) keys[k] = false;
}

// Automation hook: pretend a key is held or tapped without a real keyboard.
// The playtest harness drives the game through this.
export function setKey(action, down) {
  if (down && !keys[action]) pressed[action] = true;
  keys[action] = down;
}

export function setMouse(x, y, down) {
  mouse.x = x;
  mouse.y = y;
  if (down !== undefined) mouse.down = down;
}

export function endFrame() {
  for (const k of Object.keys(pressed)) pressed[k] = false;
  mouse.clicked = false;
}
