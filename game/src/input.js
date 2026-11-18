// Keyboard + mouse input for Aurelia Nights. Tracks held keys, edge presses,
// and the mouse position in canvas coordinates.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, consumed each frame
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    this._onKeyDown = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (!this.keys.has(k)) this.pressed.add(k);
      this.keys.add(k);
    };
    this._onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (this.canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (this.canvas.height / r.height);
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this.mouse.down = false;
    };
    this._onBlur = () => { this.keys.clear(); this.mouse.down = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  down(...names) {
    return names.some((n) => this.keys.has(n));
  }

  // True once, on the frame the key went down.
  hit(...names) {
    return names.some((n) => this.pressed.has(n));
  }

  // WASD / arrows as a -1..1 vector, y down-positive.
  moveVector() {
    let x = 0, y = 0;
    if (this.down('a', 'ArrowLeft')) x -= 1;
    if (this.down('d', 'ArrowRight')) x += 1;
    if (this.down('w', 'ArrowUp')) y -= 1;
    if (this.down('s', 'ArrowDown')) y += 1;
    return { x, y };
  }

  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
