// Aurelia Nights — controls.js
// Keyboard + mouse: movement, aiming, firing, and the hotkeys.
(function () {
  var AN = window.AN;

  AN.makeInput = function () {
    return {
      up: false, down: false, left: false, right: false,
      sprint: false, handbrake: false,
      mouseX: 0, mouseY: 0, mouseDown: false,
      pressed: {} // edge-triggered keys, consumed each frame
    };
  };

  AN.bindControls = function (G, canvas) {
    var input = G.input;
    var keymap = {
      KeyW: "up", ArrowUp: "up",
      KeyS: "down", ArrowDown: "down",
      KeyA: "left", ArrowLeft: "left",
      KeyD: "right", ArrowRight: "right",
      ShiftLeft: "sprint", ShiftRight: "sprint",
      Space: "handbrake"
    };
    window.addEventListener("keydown", function (e) {
      if (e.code === "Space") e.preventDefault();
      var mapped = keymap[e.code];
      if (mapped) input[mapped] = true;
      if (!e.repeat) {
        input.pressed[e.code] = true;
        AN.handleHotkey(G, e.code);
      }
      if (["Digit1", "Digit2", "Digit3"].indexOf(e.code) >= 0 && G.shopOpen === "gun") {
        AN.buyGunItem(G, parseInt(e.code.slice(-1), 10));
      }
      if (e.code === "Digit1") G.player.weapon = "pistol";
      if (e.code === "Digit2" && G.player.hasShotgun) G.player.weapon = "shotgun";
    });
    window.addEventListener("keyup", function (e) {
      var mapped = keymap[e.code];
      if (mapped) input[mapped] = false;
    });
    canvas.addEventListener("mousemove", function (e) {
      var r = canvas.getBoundingClientRect();
      input.mouseX = e.clientX - r.left;
      input.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener("mousedown", function (e) {
      if (e.button === 0) input.mouseDown = true;
      if (G.sound) G.sound.ensure();
      if (G.sound) G.sound.startAmbience();
    });
    window.addEventListener("mouseup", function (e) {
      if (e.button === 0) input.mouseDown = false;
    });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    window.addEventListener("blur", function () {
      input.up = input.down = input.left = input.right = false;
      input.mouseDown = false;
    });
  };

  AN.handleHotkey = function (G, code) {
    var p = G.player;
    if (code === "F1") {
      if (G.sound) {
        var muted = G.sound.toggleMute();
        G.floaters.push({ x: p.x, y: p.y - 40, text: muted ? "Sound muted (F1)" : "Sound on (F1)", t: 1.5, color: "#dfe4ea" });
      }
      return;
    }
    if (code === "KeyM") {
      if (G.mode === "playing" || G.mode === "jobboard") {
        G.mode = G.mode === "jobboard" ? "playing" : "jobboard";
        AN.refreshScreens(G);
      }
      return;
    }
    if (code === "KeyP" || code === "Escape") {
      if (G.mode === "playing") { G.mode = "paused"; AN.refreshScreens(G); }
      else if (G.mode === "paused") { G.mode = "playing"; AN.refreshScreens(G); }
      return;
    }
    if (code === "KeyH") {
      if (p.car && G.sound) G.sound.horn();
      return;
    }
    if (code === "KeyE") {
      AN.tryInteract(G);
      return;
    }
  };

  // E does context work: shop, steal/exit car, grab crate.
  AN.tryInteract = function (G) {
    var p = G.player;
    var shop = AN.nearestShop(G);
    if (shop) { AN.useShop(G, shop); return; }
    if (p.onFoot) {
      var car = AN.nearestCar(G);
      if (car) { AN.stealCar(G, car); return; }
    } else {
      AN.exitCar(G);
    }
  };

  // Aim angle from player screen position toward the mouse.
  AN.updateAim = function (G) {
    var p = G.player;
    var sx = (p.x - G.camera.x) * G.camera.zoom + G.view.w / 2;
    var sy = (p.y - G.camera.y) * G.camera.zoom + G.view.h / 2;
    p.aimAngle = Math.atan2(G.input.mouseY - sy, G.input.mouseX - sx);
    if (p.onFoot) p.angle = p.aimAngle;
  };
})();
