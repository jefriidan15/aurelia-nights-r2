// Aurelia Nights — input.js
// Keyboard + mouse state. The canvas is the only input surface; every key
// is tracked by its code so WASD, arrows and the rest all work the same.
(function () {
  'use strict';
  var A = window.Aurelia = window.Aurelia || {};

  A.keys = {};
  A.mouse = { x: 640, y: 400, down: false, clicked: false, clickX: 0, clickY: 0 };
  A.pressed = {};   // edge-triggered: true only on the frame the key went down

  A.initInput = function (canvas) {
    window.addEventListener('keydown', function (e) {
      if (!A.keys[e.code]) { A.pressed[e.code] = true; }
      A.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F1'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
      A.sfxUnlock();
    });
    window.addEventListener('keyup', function (e) { A.keys[e.code] = false; });
    window.addEventListener('blur', function () { A.keys = {}; A.mouse.down = false; });

    canvas.addEventListener('mousemove', function (e) {
      var r = canvas.getBoundingClientRect();
      A.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      A.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', function (e) {
      A.mouse.down = true;
      A.mouse.clicked = true;
      var r = canvas.getBoundingClientRect();
      A.mouse.clickX = (e.clientX - r.left) * (canvas.width / r.width);
      A.mouse.clickY = (e.clientY - r.top) * (canvas.height / r.height);
      A.sfxUnlock();
    });
    window.addEventListener('mouseup', function () { A.mouse.down = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  A.down = function (code) { return !!A.keys[code]; };

  // True once, on the frame the key was pressed. Consumed by the loop.
  A.hit = function (code) { return !!A.pressed[code]; };

  A.endFrameInput = function () {
    A.pressed = {};
    A.mouse.clicked = false;
  };

  // WASD or arrows, as a normalised {x, y} vector.
  A.moveVector = function () {
    var x = 0, y = 0;
    if (A.down('KeyA') || A.down('ArrowLeft')) { x -= 1; }
    if (A.down('KeyD') || A.down('ArrowRight')) { x += 1; }
    if (A.down('KeyW') || A.down('ArrowUp')) { y -= 1; }
    if (A.down('KeyS') || A.down('ArrowDown')) { y += 1; }
    if (x !== 0 && y !== 0) { var inv = 1 / Math.sqrt(2); x *= inv; y *= inv; }
    return { x: x, y: y };
  };

  // Aim angle in world space from the player to the mouse cursor.
  A.aimAngle = function () {
    var G = A.G;
    var sx = G.player.x - G.cam.x + 640;
    var sy = G.player.y - G.cam.y + 400;
    return Math.atan2(A.mouse.y - sy, A.mouse.x - sx);
  };
})();
