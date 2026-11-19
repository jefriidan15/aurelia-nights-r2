// Aurelia Nights — input.js
// Keyboard and mouse state for the whole game. The canvas is the only
// input surface; keys are tracked by `code`, so WASD and the arrows mean
// the same thing, and `pressed` gives the loop edge-triggered hits.
// Mouse coordinates are always in canvas pixels (1280x800), whatever
// size the canvas is styled at on screen.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.keys = {};
  A.mouse = { x: 640, y: 400, down: false, clicked: false, clickX: 0, clickY: 0 };
  // Keys that went down this frame only; the loop clears them each frame.
  A.pressed = {};

  var SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F1'];

  function canvasPoint(canvas, e) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  A.initInput = function (canvas) {
    window.addEventListener('keydown', function (e) {
      if (!A.keys[e.code]) { A.pressed[e.code] = true; }
      A.keys[e.code] = true;
      if (SCROLL_KEYS.indexOf(e.code) >= 0) { e.preventDefault(); }
      A.sfxUnlock();
    });
    window.addEventListener('keyup', function (e) { A.keys[e.code] = false; });
    window.addEventListener('blur', function () { A.keys = {}; A.mouse.down = false; });

    canvas.addEventListener('mousemove', function (e) {
      var pt = canvasPoint(canvas, e);
      A.mouse.x = pt.x; A.mouse.y = pt.y;
    });
    canvas.addEventListener('mousedown', function (e) {
      var pt = canvasPoint(canvas, e);
      A.mouse.down = true;
      A.mouse.clicked = true;
      A.mouse.clickX = pt.x; A.mouse.clickY = pt.y;
      A.sfxUnlock();
    });
    window.addEventListener('mouseup', function () { A.mouse.down = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  A.down = function (code) { return !!A.keys[code]; };

  // True once, on the frame the key went down.
  A.hit = function (code) { return !!A.pressed[code]; };

  A.endFrameInput = function () {
    A.pressed = {};
    A.mouse.clicked = false;
  };

  // WASD or arrows, normalised to a unit vector (diagonals included).
  A.moveVector = function () {
    var x = 0, y = 0;
    if (A.down('KeyA') || A.down('ArrowLeft')) { x -= 1; }
    if (A.down('KeyD') || A.down('ArrowRight')) { x += 1; }
    if (A.down('KeyW') || A.down('ArrowUp')) { y -= 1; }
    if (A.down('KeyS') || A.down('ArrowDown')) { y += 1; }
    if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x: x, y: y };
  };

  // World-space aim angle from the player to the mouse cursor.
  A.aimAngle = function () {
    var G = A.G;
    var sx = G.player.x - G.cam.x + 640;
    var sy = G.player.y - G.cam.y + 400;
    return Math.atan2(A.mouse.y - sy, A.mouse.x - sx);
  };
})();
