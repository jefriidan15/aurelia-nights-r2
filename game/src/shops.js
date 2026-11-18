// Aurelia Nights — shops.js
// The five shops, the safehouse, and street cash pickups.
(function () {
  var AN = window.AN;

  AN.SHOP_LIST = [
    { key: "spray", place: "sprayShop", label: "Lola's Spray Shop", action: "Press E: respray $100 — clears wanted, repairs car" },
    { key: "gun", place: "gunShop", label: "Iron & Oak Gun Shop", action: "Press E: shop — 1 Pistol $150 · 2 Shotgun $400 · 3 Ammo $25" },
    { key: "diner", place: "diner", label: "The Golden Gull Diner", action: "Press E: hot meal $20 — restores 50 health" },
    { key: "hospital", place: "hospital", label: "St. Aurelia General", action: "Press E: treatment $50 — full health" },
    { key: "safehouse", place: "safehouse", label: "Rosa's Flat (Safehouse)", action: "Press E: save game" }
  ];

  AN.nearestShop = function (G) {
    var p = G.player;
    for (var i = 0; i < AN.SHOP_LIST.length; i++) {
      var s = AN.SHOP_LIST[i];
      var pl = AN.PLACES[s.place];
      if (AN.dist(p.x, p.y, pl.x, pl.y) < 95) return s;
    }
    return null;
  };

  AN.useShop = function (G, shop) {
    var p = G.player;
    switch (shop.key) {
      case "spray": {
        if (p.money < AN.PRICE.spray) { AN.shopDeny(G, "Need $100 for a respray"); return; }
        p.money -= AN.PRICE.spray;
        AN.clearWanted(G, "respray");
        if (p.car) { p.car.hp = 100; p.car.wrecked = false; p.car.color = AN.pick(AN.CAR_COLORS); }
        G.floaters.push({ x: p.x, y: p.y - 40, text: "Fresh paint — heat gone, car fixed", t: 2, color: "#2ed573" });
        if (G.sound) G.sound.spray();
        break;
      }
      case "gun": {
        G.shopOpen = G.shopOpen === "gun" ? null : "gun";
        break;
      }
      case "diner": {
        if (p.health >= 100) { AN.shopDeny(G, "Already full health"); return; }
        if (p.money < AN.PRICE.dinerMeal) { AN.shopDeny(G, "Need $20 for a meal"); return; }
        p.money -= AN.PRICE.dinerMeal;
        p.health = Math.min(100, p.health + 50);
        G.floaters.push({ x: p.x, y: p.y - 40, text: "Good meal. +50 health", t: 2, color: "#2ed573" });
        if (G.sound) G.sound.pickup();
        break;
      }
      case "hospital": {
        if (p.health >= 100) { AN.shopDeny(G, "Already full health"); return; }
        if (p.money < AN.PRICE.hospital) { AN.shopDeny(G, "Need $50 for treatment"); return; }
        p.money -= AN.PRICE.hospital;
        p.health = 100;
        G.floaters.push({ x: p.x, y: p.y - 40, text: "Patched up. Full health", t: 2, color: "#2ed573" });
        if (G.sound) G.sound.pickup();
        break;
      }
      case "safehouse": {
        AN.saveGame(G);
        G.floaters.push({ x: p.x, y: p.y - 40, text: "Game saved at Rosa's Flat", t: 2, color: "#2ed573" });
        if (G.sound) G.sound.pickup();
        break;
      }
    }
  };

  AN.shopDeny = function (G, msg) {
    G.floaters.push({ x: G.player.x, y: G.player.y - 40, text: msg, t: 2, color: "#ffa502" });
  };

  // Gun shop purchases: keys 1 / 2 / 3 while the shop panel is open.
  AN.buyGunItem = function (G, n) {
    var p = G.player;
    if (n === 1) {
      if (p.money < AN.PRICE.pistol) { AN.shopDeny(G, "Pistol costs $150"); return; }
      p.money -= AN.PRICE.pistol;
      p.pistolAmmo += 24;
      p.weapon = "pistol";
      G.floaters.push({ x: p.x, y: p.y - 40, text: "Pistol stocked +24 rounds", t: 2, color: "#2ed573" });
    } else if (n === 2) {
      if (p.hasShotgun) { AN.shopDeny(G, "You already own the shotgun"); return; }
      if (p.money < AN.PRICE.shotgun) { AN.shopDeny(G, "Shotgun costs $400"); return; }
      p.money -= AN.PRICE.shotgun;
      p.hasShotgun = true;
      p.shotgunAmmo += 12;
      p.weapon = "shotgun";
      G.floaters.push({ x: p.x, y: p.y - 40, text: "Shotgun bought +12 shells", t: 2, color: "#2ed573" });
    } else if (n === 3) {
      if (p.money < AN.PRICE.ammo) { AN.shopDeny(G, "Ammo costs $25"); return; }
      p.money -= AN.PRICE.ammo;
      if (p.weapon === "shotgun" && p.hasShotgun) p.shotgunAmmo += 8;
      else p.pistolAmmo += 12;
      G.floaters.push({ x: p.x, y: p.y - 40, text: "Ammo restocked", t: 2, color: "#2ed573" });
    }
    if (G.sound) G.sound.pickup();
  };

  // ---- street cash ----
  AN.spawnCash = function (G) {
    G.cash = [];
    for (var i = 0; i < 12; i++) {
      G.cash.push(AN.makeCashDrop(G));
    }
  };

  AN.makeCashDrop = function (G) {
    var x, y, tries = 0;
    do {
      var vertical = AN.rng() < 0.5;
      if (vertical) { x = AN.pick(AN.ROAD_X) + AN.rand(-60, 60); y = AN.rand(120, 2050); }
      else { x = AN.rand(120, 3400); y = AN.pick(AN.ROAD_Y) + AN.rand(-60, 60); }
      tries++;
    } while (tries < 20 && AN.collideCity(G.city, x, y, 12).hit);
    return { x: x, y: y, value: AN.randInt(25, 75), bob: AN.rand(0, 6), taken: false, respawnT: 0 };
  };

  AN.updateCash = function (G, dt) {
    var p = G.player;
    for (var i = 0; i < G.cash.length; i++) {
      var c = G.cash[i];
      c.bob += dt * 3;
      if (c.taken) {
        c.respawnT -= dt;
        if (c.respawnT <= 0) {
          var fresh = AN.makeCashDrop(G);
          c.x = fresh.x; c.y = fresh.y; c.value = fresh.value; c.taken = false;
        }
        continue;
      }
      if (AN.dist(p.x, p.y, c.x, c.y) < 30) {
        c.taken = true;
        c.respawnT = AN.rand(25, 45);
        p.money += c.value;
        G.floaters.push({ x: c.x, y: c.y - 24, text: "+$" + c.value, t: 1.6, color: "#2ed573" });
        AN.burst(G.particles, c.x, c.y, 8, "#2ed573", 110, 0.5);
        if (G.sound) G.sound.pickup();
      }
    }
  };
})();
