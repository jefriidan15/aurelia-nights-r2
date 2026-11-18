// Aurelia Nights — hud.js
// DOM screens (title, how-to, job board, pause, busted, wasted, win)
// and the screen-state switcher.
(function () {
  var AN = window.AN;

  AN.SCREEN_IDS = ["screen-title", "screen-howto", "screen-jobboard", "screen-pause",
    "screen-busted", "screen-wasted", "screen-win", "screen-end"];

  AN.refreshScreens = function (G) {
    var show = null;
    if (G.mode === "title") show = "screen-title";
    else if (G.mode === "howto") show = "screen-howto";
    else if (G.mode === "jobboard") show = "screen-jobboard";
    else if (G.mode === "paused") show = "screen-pause";
    else if (G.mode === "busted") show = "screen-busted";
    else if (G.mode === "wasted") show = "screen-wasted";
    else if (G.mode === "win") show = "screen-win";
    else if (G.mode === "end") show = "screen-end";
    AN.SCREEN_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.toggle("hidden", id !== show);
    });
    if (show === "screen-jobboard") AN.renderJobBoard(G);
    if (show === "screen-win") {
      var el = document.getElementById("win-stats");
      if (el) el.textContent = "All six jobs complete — $" + G.player.money + " in the pocket. Port Aurelia is yours, Aurelia.";
    }
    var hud = document.getElementById("hud");
    if (hud) hud.classList.toggle("hidden", show !== null && show !== "screen-jobboard");
  };

  AN.renderJobBoard = function (G) {
    var list = document.getElementById("job-list");
    if (!list) return;
    list.innerHTML = "";
    AN.JOBS.forEach(function (job, i) {
      var row = document.createElement("div");
      row.className = "job-row" + (i < G.job.index ? " done" : "") + (i === G.job.index ? " current" : "");
      var status = i < G.job.index ? "DONE" : (i === G.job.index ? (G.job.phase === "active" ? "ACTIVE" : "READY") : "LOCKED");
      row.innerHTML = "<b>" + job.id + ". " + job.name + "</b> — $" + job.pay +
        " <span class='job-status'>" + status + "</span><br><span class='job-brief'>" + job.brief + "</span>";
      if (i === G.job.index && G.job.phase !== "active") {
        var btn = document.createElement("button");
        btn.textContent = "Start job";
        btn.addEventListener("click", function () {
          AN.startJob(G, i);
          G.mode = "playing";
          AN.refreshScreens(G);
        });
        row.appendChild(document.createElement("br"));
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
  };

  AN.bindScreens = function (G) {
    function on(id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("click", fn);
    }
    on("btn-new-game", function () {
      AN.clearSave();
      G.mode = "playing";
      AN.refreshScreens(G);
      if (G.sound) { G.sound.ensure(); G.sound.startAmbience(); }
    });
    on("btn-continue", function () {
      AN.loadSave(G);
      G.mode = "playing";
      AN.refreshScreens(G);
      if (G.sound) { G.sound.ensure(); G.sound.startAmbience(); }
    });
    on("btn-howto", function () { G.mode = "howto"; AN.refreshScreens(G); });
    on("btn-howto-back", function () { G.mode = "title"; AN.refreshScreens(G); });
    on("btn-jobboard-close", function () { G.mode = "playing"; AN.refreshScreens(G); });
    on("btn-resume", function () { G.mode = "playing"; AN.refreshScreens(G); });
    on("btn-quit-title", function () { G.mode = "title"; AN.refreshScreens(G); });
    on("btn-busted-ok", function () { G.mode = "playing"; AN.refreshScreens(G); });
    on("btn-wasted-ok", function () { G.mode = "playing"; AN.refreshScreens(G); });
    on("btn-win-again", function () {
      AN.clearSave();
      window.location.reload();
    });
    var cont = document.getElementById("btn-continue");
    if (cont) cont.classList.toggle("hidden", !AN.hasSave());
  };
})();
