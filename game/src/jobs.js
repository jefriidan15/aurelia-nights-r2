// Aurelia Nights — jobs.js
// The six story jobs: state machine, timers, checkpoints and payouts.
(function () {
  var AN = window.AN;

  AN.makeJobState = function () {
    return {
      index: 0, // 0-based into AN.JOBS; 6 means all done
      phase: "idle", // idle | active | done
      timer: 0,
      holdT: 0,
      checkpointsHit: 0,
      checkpointIdx: 0,
      jobFlags: {},
      message: "",
      messageT: 0
    };
  };

  AN.currentJob = function (G) {
    if (G.job.index >= AN.JOBS.length) return null;
    return AN.JOBS[G.job.index];
  };

  AN.jobObjective = function (G) {
    var job = AN.currentJob(G);
    if (!job) return "King of Port Aurelia — all jobs done!";
    if (G.job.phase !== "active") return "Job " + job.id + " ready: " + job.name + " — press M for the job board";
    switch (job.id) {
      case 1:
        return G.player.car ? "Deliver the car to Big Sal's Chop Shop (yellow marker)" : "Steal a car — walk up and press E";
      case 2:
        return G.wanted >= 3 ? "Survive at 3+ stars: " + Math.ceil(G.job.timer) + "s left" : "Raise the heat to 3 stars first";
      case 3:
        return AN.guardsLeft(G) > 0 ? "Clear the Pier 9 guards: " + AN.guardsLeft(G) + " left" : "Grab the crate on the pier!";
      case 4:
        if (G.job.jobFlags.vaultHeld) return "Vault cracked! Escape to Rosa's Flat";
        return "Hold the bank vault: " + Math.ceil(20 - G.job.holdT) + "s (stay in the ring)";
      case 5:
        return "Hit checkpoint " + (G.job.checkpointIdx + 1) + "/3 at 4 stars — " + Math.ceil(G.job.timer) + "s left";
      case 6:
        return G.job.jobFlags.lockdownDone ? "Lockdown survived! Reach the North Airfield" : "Survive at 5 stars: " + Math.ceil(G.job.timer) + "s left";
      default:
        return job.brief;
    }
  };

  AN.startJob = function (G, idx) {
    if (idx >= AN.JOBS.length) return;
    var job = AN.JOBS[idx];
    G.job.index = idx;
    G.job.phase = "active";
    G.job.timer = 0;
    G.job.holdT = 0;
    G.job.checkpointsHit = 0;
    G.job.checkpointIdx = 0;
    G.job.jobFlags = {};
    if (job.id === 2) G.job.timer = 60;
    if (job.id === 5) { G.job.timer = 150; AN.placeCheckpoints(G); }
    if (job.id === 6) G.job.timer = 90;
    if (job.id === 3) AN.spawnGuards(G);
    G.job.message = "JOB " + job.id + ": " + job.name + " — " + job.brief;
    G.job.messageT = 5;
    if (G.sound) G.sound.jobStart();
  };

  AN.placeCheckpoints = function (G) {
    G.checkpoints = [
      { x: 3300, y: 750, r: 70, hit: false, label: "Marina" },
      { x: 300, y: 1650, r: 70, hit: false, label: "Little Vesper" },
      { x: 1800, y: 2100, r: 70, hit: false, label: "Midtown South" }
    ];
  };

  AN.completeJob = function (G) {
    var job = AN.currentJob(G);
    if (!job) return;
    G.player.money += job.pay;
    G.job.message = "JOB COMPLETE: " + job.name + " — +$" + job.pay;
    G.job.messageT = 5;
    G.floaters.push({ x: G.player.x, y: G.player.y - 50, text: "+$" + job.pay, t: 2.5, color: "#2ed573" });
    if (G.sound) G.sound.jobDone();
    G.job.index += 1;
    G.job.phase = "idle";
    G.job.timer = 0;
    G.job.holdT = 0;
    G.job.checkpointsHit = 0;
    G.job.checkpointIdx = 0;
    G.job.jobFlags = {};
    G.checkpoints = [];
    G.guards = [];
    if (G.job.index >= AN.JOBS.length) {
      G.mode = "win";
      G.winT = 0;
      if (G.sound) G.sound.win();
    }
  };

  AN.failJob = function (G, why) {
    var job = AN.currentJob(G);
    if (!job) return;
    G.job.phase = "idle";
    G.job.timer = 0;
    G.job.holdT = 0;
    G.job.checkpointsHit = 0;
    G.job.checkpointIdx = 0;
    G.job.jobFlags = {};
    G.checkpoints = [];
    G.guards = [];
    G.job.message = "JOB FAILED: " + job.name + " — " + why + " Press M to try again.";
    G.job.messageT = 6;
    if (G.sound) G.sound.fail();
  };

  AN.updateJobs = function (G, dt) {
    if (G.job.messageT > 0) G.job.messageT -= dt;
    var job = AN.currentJob(G);
    if (!job || G.job.phase !== "active") return;
    var p = G.player;
    switch (job.id) {
      case 1: {
        if (p.car && AN.dist(p.x, p.y, AN.PLACES.chopShop.x, AN.PLACES.chopShop.y) < 90) {
          AN.completeJob(G);
        }
        break;
      }
      case 2: {
        if (G.wanted >= 3) {
          G.job.timer -= dt;
          if (G.job.timer <= 0) AN.completeJob(G);
        }
        break;
      }
      case 3: {
        if (AN.guardsLeft(G) === 0 && G.guards.length > 0) {
          if (AN.dist(p.x, p.y, AN.PLACES.crateSpot.x, AN.PLACES.crateSpot.y) < 60) {
            G.crateTaken = true;
            AN.completeJob(G);
          }
        }
        break;
      }
      case 4: {
        if (!G.job.jobFlags.vaultHeld) {
          if (AN.dist(p.x, p.y, AN.PLACES.vault.x, AN.PLACES.vault.y) < 80) {
            G.job.holdT += dt;
            if (G.job.holdT >= 20) {
              G.job.jobFlags.vaultHeld = true;
              G.job.message = "Vault cracked! Now escape to Rosa's Flat — don't get caught.";
              G.job.messageT = 4;
            }
          } else {
            G.job.holdT = Math.max(0, G.job.holdT - dt * 0.5);
          }
        } else if (AN.dist(p.x, p.y, AN.PLACES.safehouse.x, AN.PLACES.safehouse.y) < 90) {
          AN.completeJob(G);
        }
        break;
      }
      case 5: {
        if (G.wanted < 4) {
          // Heat dropped: clock keeps running, markers stay.
        }
        G.job.timer -= dt;
        if (G.job.timer <= 0) { AN.failJob(G, "time ran out"); break; }
        var cp = G.checkpoints[G.job.checkpointIdx];
        if (cp && G.wanted >= 4 && AN.dist(p.x, p.y, cp.x, cp.y) < cp.r) {
          cp.hit = true;
          G.job.checkpointIdx += 1;
          G.job.checkpointsHit += 1;
          if (G.sound) G.sound.checkpoint();
          if (G.job.checkpointIdx >= G.checkpoints.length) AN.completeJob(G);
        }
        break;
      }
      case 6: {
        if (G.wanted >= 5) {
          G.job.timer -= dt;
          if (G.job.timer <= 0) {
            G.job.jobFlags.lockdownDone = true;
            G.job.message = "Lockdown survived! Get to the North Airfield.";
            G.job.messageT = 4;
          }
        }
        if (G.job.jobFlags.lockdownDone &&
          AN.dist(p.x, p.y, AN.PLACES.airfield.x, AN.PLACES.airfield.y) < 100) {
          AN.completeJob(G);
        }
        break;
      }
    }
  };
})();
