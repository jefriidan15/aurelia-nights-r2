// Aurelia Nights — savegame.js
// localStorage save / continue for the campaign.
(function () {
  var AN = window.AN;
  AN.SAVE_KEY = "aurelia-nights-save-v6";

  AN.saveGame = function (G) {
    try {
      var p = G.player;
      var data = {
        v: 6,
        money: p.money,
        health: p.health,
        pistolAmmo: p.pistolAmmo,
        shotgunAmmo: p.shotgunAmmo,
        hasShotgun: p.hasShotgun,
        weapon: p.weapon,
        jobIndex: G.job.index,
        x: p.x, y: p.y,
        wanted: 0,
        timeOfDay: G.timeOfDay,
        savedAt: Date.now()
      };
      window.localStorage.setItem(AN.SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) { return false; }
  };

  AN.hasSave = function () {
    try { return !!window.localStorage.getItem(AN.SAVE_KEY); }
    catch (e) { return false; }
  };

  AN.loadSave = function (G) {
    try {
      var raw = window.localStorage.getItem(AN.SAVE_KEY);
      if (!raw) return false;
      var d = JSON.parse(raw);
      if (!d || d.v !== 6) return false;
      var p = G.player;
      p.money = d.money;
      p.health = d.health;
      p.pistolAmmo = d.pistolAmmo;
      p.shotgunAmmo = d.shotgunAmmo;
      p.hasShotgun = !!d.hasShotgun;
      p.weapon = d.weapon || "pistol";
      p.x = d.x; p.y = d.y;
      G.job.index = d.jobIndex || 0;
      G.job.phase = "idle";
      G.timeOfDay = d.timeOfDay || 0.3;
      return true;
    } catch (e) { return false; }
  };

  AN.clearSave = function () {
    try { window.localStorage.removeItem(AN.SAVE_KEY); } catch (e) {}
  };
})();
