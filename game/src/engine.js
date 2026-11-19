// Aurelia Nights — engine: game loop, camera, rendering, wanted system, particles.
import { buildCity, WORLD_W, WORLD_H, pushOutOfSolid, districtAt } from './city.js';
import { makePlayer, seedCrowd, updateCrowd, updateCops, updateRivals, damagePlayer, makeCop, makeRival } from './actors.js';
import { seedTraffic, seedParked, driveCar, updateTraffic, nearestStealable, spawnCar, POLICE_MODEL, carDistance } from './vehicles.js';
import { WEAPONS, fireWeapon, updateBullets, seedPickups, collectPickups } from './combat.js';
import { STORY, missionState, advanceStory, startMission, makeTaxiJob, makeCourierJob } from './jobs.js';
import { makeChance, clamp, angleTo } from './rngkit.js';

export function createGame(canvas, hud, sound) {
  const ctx = canvas.getContext('2d');
  const state = {
    city: buildCity(20261119),
    player: makePlayer(1500, 560),
    crowd: [], traffic: [], parked: [], policeCars: [], cops: [], rivals: [],
    bullets: [], sparks: [], pickups: [],
    mission: missionState(),
    sideJob: null,
    wanted: 0, wantedHeat: 0, clockMinutes: 8 * 60,
    objectivePos: null, running: false, paused: false,
    camera: { x: 1500, y: 560, zoom: 1 },
    keys: {}, mouse: { x: 0, y: 0, down: false },
    fireCooldown: 0, policeTimer: 0, sirenTimer: 0, elapsed: 0,
    toast: (t) => hud.toast(t),
    onKill: null, hurtPlayer: null, spawnRivals: null,
  };
  state.pickups = seedPickups(state.city);
  state.crowd = seedCrowd(state.city, 42);
  state.traffic = seedTraffic(state.city, 16);
  state.parked = seedParked(state.city, 14);

  state.onKill = (victim) => {
    state.sparks.push({ x: victim.x, y: victim.y, life: 0.5, max: 0.5, color: '#ff5f4d' });
    if (victim.kind === 'rival') {
      state.mission.killsDone++;
      state.player.cash += 25;
      state.player.respect += 1;
      hud.toast('Rival down — +$25');
      state.rivals = state.rivals.filter((r) => r !== victim);
      if (state.mission.active) {
        const step = STORY[state.mission.index]?.steps[state.mission.step];
        if (step && step.type === 'clear' && state.mission.killsDone >= state.mission.killsNeeded) {
          state.spawnRivals(0, 0, 0); // clear leftovers marker
        }
      }
    } else if (victim.kind === 'cop') {
      state.cops = state.cops.filter((c) => c !== victim);
      raiseWanted(state, 1);
    }
  };
  state.hurtPlayer = (amount, by) => {
    damagePlayer(state.player, amount, state.elapsed);
    if (!state.player.alive) endRun(state, 'wasted');
  };
  state.spawnRivals = (count, x, y) => {
    const rnd = makeChance(Math.floor(Math.random() * 1e9));
    for (let i = 0; i < count; i++) {
      state.rivals.push(makeRival(x + rnd.range(-160, 160), y + rnd.range(-160, 160)));
    }
  };

  function raiseWanted(st, stars) {
    st.wanted = clamp(st.wanted + stars, 0, 5);
    st.wantedHeat = 100;
    if (st.wanted >= 1) sound.siren();
  }

  function lowerWanted(st, dt) {
    if (st.wanted === 0) return;
    const nearCop = st.policeCars.some((c) => carDistance(c, st.player.inCar || st.player) < 420)
      || st.cops.some((c) => Math.hypot(c.x - st.player.x, c.y - st.player.y) < 300);
    if (!nearCop) st.wantedHeat -= dt * 6;
    else st.wantedHeat = Math.min(100, st.wantedHeat + dt * 2);
    if (st.wantedHeat <= 0) {
      st.wanted = Math.max(0, st.wanted - 1);
      st.wantedHeat = st.wanted > 0 ? 60 : 0;
      if (st.wanted === 0) hud.toast('You lost the heat. Lay low.');
    }
  }

  function spawnPolice(st) {
    const want = st.wanted >= 3 ? 3 : st.wanted >= 1 ? 2 : 0;
    if (st.policeCars.length >= want) return;
    const p = st.player.inCar || st.player;
    const ang = Math.random() * Math.PI * 2;
    const car = spawnCar(st.city, POLICE_MODEL, clamp(p.x + Math.cos(ang) * 700, 100, 3500), clamp(p.y + Math.sin(ang) * 700, 100, 2700), ang, { police: true });
    st.policeCars.push(car);
    if (st.wanted >= 2 && st.cops.length < 3) st.cops.push(makeCop(p.x + 300, p.y - 200));
  }

  function updatePoliceCars(st, dt) {
    const target = st.player.inCar || st.player;
    for (let i = st.policeCars.length - 1; i >= 0; i--) {
      const car = st.policeCars[i];
      const d = carDistance(car, target);
      const wantAngle = angleTo(car.x, car.y, target.x, target.y);
      let diff = wantAngle - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
      car.speed = clamp(car.speed + 200 * dt, 0, 340);
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      pushOutOfSolid(st.city, car, 20);
      if (d < 52 && (car.ramCd || 0) <= 0) {
        car.ramCd = 0.8;
        // Ram: damage the player's car / player, slow both.
        if (st.player.inCar) {
          st.player.inCar.speed *= 0.4;
          damagePlayer(st.player, 4, st.elapsed);
          sound.crash();
          st.sparks.push({ x: car.x, y: car.y, life: 0.4, max: 0.4, color: '#ffd23e' });
        } else {
          damagePlayer(st.player, 10, st.elapsed);
        }
        car.speed *= 0.3;
        if (!st.player.alive) endRun(st, 'wasted');
      }
      if (st.wanted === 0 && d > 900) st.policeCars.splice(i, 1);
      if ((car.ramCd || 0) > 0) car.ramCd -= dt;
    }
  }

  function computeObjective(st) {
    if (st.sideJob) {
      const j = st.sideJob;
      st.objectivePos = j.stage === 'pickup' ? j.pickup : j.dropoff;
      return;
    }
    if (!st.mission.active) { st.objectivePos = { x: 1500, y: 520 }; return; }
    const m = STORY[st.mission.index];
    if (!m) { st.objectivePos = null; return; }
    const step = m.steps[st.mission.step];
    if (!step) { st.objectivePos = null; return; }
    if (step.type === 'race') st.objectivePos = step.checkpoints[st.mission.raceHits] || null;
    else if (step.x !== undefined) st.objectivePos = { x: step.x, y: step.y };
    else st.objectivePos = null;
  }

  function updateSideJob(st) {
    const j = st.sideJob;
    if (!j) return;
    const p = st.player.inCar || st.player;
    const target = j.stage === 'pickup' ? j.pickup : j.dropoff;
    if ((p.x - target.x) ** 2 + (p.y - target.y) ** 2 < 70 * 70) {
      if (j.stage === 'pickup') { j.stage = 'dropoff'; hud.toast('Passenger in — drive to the drop-off'); }
      else {
        st.player.cash += j.fare;
        st.player.respect += 2;
        hud.toast(`Job done — +$${j.fare}`);
        sound.mission();
        st.sideJob = null;
      }
    }
  }

  function step(dt) {
    const st = state;
    st.elapsed += dt;
    st.clockMinutes = (st.clockMinutes + dt * 0.6) % (24 * 60);
    const p = st.player;
    const aim = Math.atan2(st.mouse.y - canvas.height / 2, st.mouse.x - canvas.width / 2);
    const input = {
      up: st.keys['KeyW'] || st.keys['ArrowUp'],
      down: st.keys['KeyS'] || st.keys['ArrowDown'],
      left: st.keys['KeyA'] || st.keys['ArrowLeft'],
      right: st.keys['KeyD'] || st.keys['ArrowRight'],
      sprint: st.keys['ShiftLeft'] || st.keys['ShiftRight'],
      handbrake: st.keys['Space'],
      aimAngle: p.inCar ? (p.inCar.angle) : aim + Math.atan2(0, 1) * 0, // on foot: aim at mouse
    };
    // Aim angle in world space: camera-relative mouse -> world direction.
    const cam = st.camera;
    const worldMouseX = cam.x + (st.mouse.x - canvas.width / 2) / cam.zoom;
    const worldMouseY = cam.y + (st.mouse.y - canvas.height / 2) / cam.zoom;
    input.aimAngle = Math.atan2(worldMouseY - p.y, worldMouseX - p.x);

    if (p.inCar) {
      driveCar(p.inCar, input, dt);
      pushOutOfSolid(st.city, p.inCar, 22);
      p.inCar.x = clamp(p.inCar.x, 60, WORLD_W - 60);
      p.inCar.y = clamp(p.inCar.y, 60, WORLD_H - 60);
      p.x = p.inCar.x; p.y = p.inCar.y; p.angle = p.inCar.angle;
      // Collisions with traffic: separate the cars and bleed a little speed.
      for (const t of [...st.traffic, ...st.parked]) {
        if (t === p.inCar) continue;
        const d = carDistance(t, p.inCar);
        if (d < 46 && d > 0.01) {
          const push = (46 - d) / 2;
          const nx = (t.x - p.inCar.x) / d, ny = (t.y - p.inCar.y) / d;
          t.x += nx * push; t.y += ny * push;
          p.inCar.x -= nx * push * 0.5; p.inCar.y -= ny * push * 0.5;
          if (Math.abs(p.inCar.speed) > 150 && (t.hitCd || 0) <= 0) { sound.crash(); t.hitCd = 1; }
          p.inCar.speed *= 0.985;
          t.speed = (t.speed || 0) * 0.9;
        }
        if ((t.hitCd || 0) > 0) t.hitCd -= dt;
      }
    } else {
      // On foot movement via actors module logic (inlined walk here for aim).
      const sprint = input.sprint ? 1.55 : 1;
      const top = 165 * sprint;
      let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
      const len = Math.hypot(mx, my) || 1;
      p.x += (mx / len) * top * dt * (len > 0 ? 1 : 0);
      p.y += (my / len) * top * dt * (len > 0 ? 1 : 0);
      p.x = clamp(p.x, 40, WORLD_W - 40);
      p.y = clamp(p.y, 40, WORLD_H - 40);
      pushOutOfSolid(st.city, p, 14);
      p.angle = input.aimAngle;
      p.moving = len > 1.01 || (mx !== 0 || my !== 0);
    }

    // Shooting
    st.fireCooldown -= dt;
    const w = WEAPONS[p.weapon];
    if (st.mouse.down && !p.inCar && st.fireCooldown <= 0 && p.alive) {
      if (w.ammo === Infinity || (p.ammo[w.ammo] ?? 0) > 0) {
        const shots = fireWeapon(st, p, p.angle);
        for (const s of shots) { if (s.kind !== 'dry') st.bullets.push(s); }
        sound.shoot(p.weapon);
        st.fireCooldown = w.rate;
        raiseWanted(st, 0); // firing in public draws eyes
        if (st.wanted === 0 && Math.random() < 0.4) raiseWanted(st, 1);
        st.sparks.push({ x: p.x + Math.cos(p.angle) * 26, y: p.y + Math.sin(p.angle) * 26, life: 0.08, max: 0.08, color: '#ffe066' });
      } else {
        sound.dry();
        st.fireCooldown = 0.3;
        hud.setHint('Out of ammo — visit the Gun Locker');
      }
    }
    updateBullets(st, st.bullets, dt);
    updateTraffic(st.city, st.traffic, dt, p.inCar || p);
    const danger = st.bullets.length ? { x: p.x, y: p.y } : null;
    updateCrowd(st.city, st.crowd, dt, danger);
    collectPickups(st);

    // Police
    st.policeTimer -= dt;
    if (st.wanted > 0 && st.policeTimer <= 0) { spawnPolice(st); st.policeTimer = 2.5; }
    updatePoliceCars(st, dt);
    const copEvent = updateCops(st.city, st.cops, p, dt, st.wanted);
    if (copEvent) {
      if (copEvent.kind === 'busted') endRun(st, 'busted');
      else if (copEvent.kind === 'shot') { damagePlayer(p, copEvent.damage, st.elapsed); if (!p.alive) endRun(st, 'wasted'); }
    }
    for (const ev of updateRivals(st.city, st.rivals, p, dt)) {
      if (ev.kind === 'shot') {
        const b = { x: ev.by.x, y: ev.by.y, angle: angleTo(ev.by.x, ev.by.y, p.x, p.y), damage: ev.damage, owner: ev.by, range: 380, traveled: 0, speed: 700 };
        st.bullets.push(b);
      }
    }
    lowerWanted(st, dt);

    // Missions + side jobs
    const ev = advanceStory(st);
    if (ev) {
      if (ev.startsWith('mission-complete:')) {
        const [, title, reward] = ev.split(':');
        hud.banner(`MISSION COMPLETE — ${title}`);
        hud.toast(`+$${reward} — next mission ready (press J)`);
        sound.mission();
      } else if (ev.startsWith('step:')) {
        hud.toast(ev.slice(5));
        const step = STORY[st.mission.index]?.steps[st.mission.step];
        if (step && step.type === 'clear') {
          st.mission.killsNeeded = step.count;
          st.mission.killsDone = 0;
          st.spawnRivals(step.count, 3050, 1650);
        }
      }
    }
    updateSideJob(st);

    // Sparks decay
    for (let i = st.sparks.length - 1; i >= 0; i--) {
      st.sparks[i].life -= dt;
      if (st.sparks[i].life <= 0) st.sparks.splice(i, 1);
    }

    // Camera follows the player / car, clamped to the world.
    const tx = p.inCar ? p.inCar.x : p.x;
    const ty = p.inCar ? p.inCar.y : p.y;
    st.camera.x += (tx - st.camera.x) * Math.min(1, dt * 5);
    st.camera.y += (ty - st.camera.y) * Math.min(1, dt * 5);
    st.camera.x = clamp(st.camera.x, canvas.width / 2 - 100, WORLD_W - canvas.width / 2 + 100);
    st.camera.y = clamp(st.camera.y, canvas.height / 2 - 100, WORLD_H - canvas.height / 2 + 100);
    computeObjective(st);
  }

  function endRun(st, how) {
    if (!st.running) return;
    st.running = false;
    const fine = how === 'busted' ? 200 : 150;
    const lost = Math.min(st.player.cash, fine);
    st.player.cash -= lost;
    sound.busted();
    if (how === 'busted') hud.showEnd('BUSTED', `The ABPD took you in. You paid $${lost} in fines and woke up at headquarters. Your car is gone — but the jobs are still waiting.`);
    else hud.showEnd('WASTED', `You went down in Aurelia Bay. The hospital patched you up for $${lost}. Vera is not happy — but she still has work for you.`);
    st.player.health = 100;
    st.player.alive = true;
    st.player.inCar = null;
    st.wanted = 0;
    st.policeCars = [];
    st.cops = [];
    if (how === 'busted') { st.player.x = 2650; st.player.y = 1340; }
    else { st.player.x = 1500; st.player.y = 1340; }
    st.camera.x = st.player.x; st.camera.y = st.player.y;
  }

  function draw() {
    const st = state;
    const cam = st.camera;
    const hour = Math.floor(st.clockMinutes / 60);
    const night = hour >= 20 || hour < 6;
    const dusk = (hour >= 17 && hour < 20) || (hour >= 6 && hour < 8);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = night ? '#0d1526' : dusk ? '#2a2a44' : '#7ec8a0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2 - cam.x, canvas.height / 2 - cam.y);
    const view = { x0: cam.x - canvas.width / 2 - 60, y0: cam.y - canvas.height / 2 - 60, x1: cam.x + canvas.width / 2 + 60, y1: cam.y + canvas.height / 2 + 60 };

    // Ground: district-tinted grass/concrete, beach sand, water.
    ctx.fillStyle = night ? '#1a2436' : '#8fae7e';
    ctx.fillRect(0, 0, WORLD_W, WORLD_H);
    ctx.fillStyle = night ? '#14263e' : '#3d7a9e';
    ctx.fillRect(0, 0, 120, WORLD_H); // west water
    ctx.fillStyle = night ? '#2a2a3a' : '#e8d29a';
    ctx.fillRect(0, 2620, WORLD_W, 180); // beach
    ctx.fillStyle = night ? '#1d4e63' : '#2e6d8a';
    ctx.fillRect(0, 2740, WORLD_W, 60); // sea edge
    // District tint patches
    for (const d of st.city.districts) {
      ctx.fillStyle = night ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(d.x, d.y, d.w, d.h);
    }
    // Roads
    ctx.fillStyle = night ? '#232936' : '#3a3f4a';
    for (const rx of st.city.roadsV) ctx.fillRect(rx - 34, 0, 68, WORLD_H);
    for (const ry of st.city.roadsH) ctx.fillRect(0, ry - 34, WORLD_W, 68);
    ctx.strokeStyle = night ? '#6a6a4a' : '#e8d95a';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 22]);
    for (const rx of st.city.roadsV) { ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, WORLD_H); ctx.stroke(); }
    for (const ry of st.city.roadsH) { ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(WORLD_W, ry); ctx.stroke(); }
    ctx.setLineDash([]);
    // Trees + lamps
    for (const t of st.city.trees) {
      if (t.x < view.x0 || t.x > view.x1 || t.y < view.y0 || t.y > view.y1) continue;
      ctx.fillStyle = night ? '#1d3a24' : '#2e7a3d';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill();
    }
    // Buildings
    for (const b of st.city.buildings) {
      if (b.x + b.w < view.x0 || b.x > view.x1 || b.y + b.h < view.y0 || b.y > view.y1) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.wall;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
      ctx.fillStyle = night ? '#ffe066' : '#2a2a3a';
      const cols = Math.max(1, Math.floor(b.w / 34));
      const rows = Math.max(1, Math.floor(b.h / 34));
      for (let cx = 0; cx < cols; cx++) for (let cy = 0; cy < rows; cy++) {
        ctx.fillRect(b.x + 10 + cx * 34, b.y + 10 + cy * 34, 14, 12);
      }
      if (b.tall) { ctx.fillStyle = b.roof; ctx.fillRect(b.x + b.w / 3, b.y + b.h / 3, b.w / 3, b.h / 3); }
    }
    // Docks
    for (const d of st.city.docks) {
      ctx.fillStyle = d.kind === 'crane' ? '#c9a13d' : (d.kind === 'container' ? '#3d7ac9' : '#5f6d8a');
      ctx.fillRect(d.x, d.y, d.w, d.h);
      ctx.strokeStyle = '#1c1c22'; ctx.lineWidth = 2; ctx.strokeRect(d.x, d.y, d.w, d.h);
    }
    // Landmark labels
    ctx.fillStyle = night ? '#ffd23e' : '#1c1c22';
    ctx.font = 'bold 15px sans-serif';
    for (const lm of Object.values(st.city.landmarks)) {
      ctx.fillText(lm.label, lm.x - 40, lm.y - 12);
    }
    // Pickups
    for (const pk of st.pickups) {
      if (pk.taken) continue;
      const colors = { health: '#37d67a', armor: '#3f8cff', ammo: '#ffd23e', cash: '#7dff9b' };
      ctx.fillStyle = colors[pk.kind] || '#fff';
      ctx.beginPath(); ctx.arc(pk.x, pk.y, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#14101f'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(pk.kind === 'health' ? '+' : pk.kind === 'armor' ? 'A' : pk.kind === 'ammo' ? '•' : '$', pk.x, pk.y + 4);
      ctx.textAlign = 'left';
    }
    // Objective marker
    if (st.objectivePos) {
      const pulse = 26 + Math.sin(st.elapsed * 4) * 6;
      ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(st.objectivePos.x, st.objectivePos.y, pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd23e';
      ctx.beginPath(); ctx.arc(st.objectivePos.x, st.objectivePos.y, 6, 0, Math.PI * 2); ctx.fill();
    }
    // Crowd
    for (const p of st.crowd) drawPerson(ctx, p.x, p.y, p.angle, p.shirt, p.panic > 0);
    // Rivals + cops
    for (const r of st.rivals) drawPerson(ctx, r.x, r.y, r.angle, r.shirt, true, true);
    for (const c of st.cops) drawPerson(ctx, c.x, c.y, c.angle, c.shirt, false, false, true);
    // Cars
    for (const car of [...st.parked, ...st.traffic, ...st.policeCars]) drawCar(ctx, car, night);
    if (st.player.inCar) drawCar(ctx, st.player.inCar, night);
    // Bullets + sparks
    ctx.fillStyle = '#ffe066';
    for (const b of st.bullets) { ctx.fillRect(b.x - 2, b.y - 2, 5, 5); }
    for (const s of st.sparks) {
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Player on foot
    if (!st.player.inCar && st.player.alive) drawPerson(ctx, st.player.x, st.player.y, st.player.angle, '#e8e0c8', false, false, false, true);
    ctx.restore();
    // Night vignette
    if (night) {
      ctx.fillStyle = 'rgba(6,10,30,0.34)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (dusk) {
      ctx.fillStyle = 'rgba(255,120,40,0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawPerson(g, x, y, angle, shirt, panicked, armed, isCop, isPlayer) {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(0, 3, 12, 9, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = shirt;
    g.beginPath(); g.arc(0, 0, 11, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#f2c89b';
    g.beginPath(); g.arc(4, 0, 6, 0, Math.PI * 2); g.fill();
    if (armed) { g.fillStyle = '#222'; g.fillRect(10, -2, 12, 4); }
    if (isCop) { g.fillStyle = '#ffd23e'; g.font = 'bold 9px sans-serif'; g.fillText('ABPD', -12, -14); }
    if (isPlayer) { g.strokeStyle = '#ffd23e'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.stroke(); }
    if (panicked) { g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.fillText('!', -2, -18); }
    g.restore();
  }

  function drawCar(g, car, night) {
    g.save();
    g.translate(car.x, car.y);
    g.rotate(car.angle);
    const m = car.model;
    g.fillStyle = 'rgba(0,0,0,0.32)';
    g.fillRect(-m.len / 2 + 3, -m.wid / 2 + 4, m.len, m.wid);
    g.fillStyle = m.color;
    g.beginPath();
    g.roundRect(-m.len / 2, -m.wid / 2, m.len, m.wid, 7);
    g.fill();
    g.fillStyle = '#1c2733';
    g.fillRect(-m.len / 6, -m.wid / 2 + 3, m.len / 3, m.wid - 6);
    g.fillStyle = night ? '#ffe9a8' : '#dfe8ff';
    g.fillRect(m.len / 2 - 8, -m.wid / 2 + 3, 4, 5);
    g.fillRect(m.len / 2 - 8, m.wid / 2 - 8, 4, 5);
    if (car.police) {
      g.fillStyle = '#fff';
      g.fillRect(-4, -m.wid / 2, 8, m.wid);
      g.fillStyle = '#d21f2b';
      g.fillRect(-m.len / 2 + 2, -m.wid / 2 + 2, 8, 6);
      g.fillStyle = '#2b6fd2';
      g.fillRect(-m.len / 2 + 2, m.wid / 2 - 8, 8, 6);
      const flash = Math.sin(state.elapsed * 12) > 0;
      g.fillStyle = flash ? '#ff2b2b' : '#2b6fd2';
      g.beginPath(); g.arc(0, 0, 5, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  let last = 0, raf = 0;
  function loop(ts) {
    if (!state.running || state.paused) { raf = requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    step(dt);
    draw();
    hud.update(state);
    raf = requestAnimationFrame(loop);
  }

  return {
    state,
    start(fresh) {
      if (fresh) {
        state.player = makePlayer(1500, 560);
        state.mission = missionState();
        state.wanted = 0; state.wantedHeat = 0;
        state.policeCars = []; state.cops = []; state.rivals = [];
        state.bullets = []; state.sparks = [];
        state.pickups = seedPickups(state.city);
        state.clockMinutes = 8 * 60;
        state.camera.x = 1500; state.camera.y = 560;
      }
      state.running = true;
      state.paused = false;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
      draw();
    },
    stop() { state.running = false; cancelAnimationFrame(raf); },
    pause(v) { state.paused = v; },
    step, draw, endRun,
    enterExitCar() {
      const st = state, p = st.player;
      if (p.inCar) {
        const car = p.inCar;
        p.inCar = null;
        p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
        p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
        car.parked = true;
        hud.setHint('');
        return 'exit';
      }
      const near = nearestStealable([...st.parked, ...st.traffic], p.x, p.y, 64);
      if (!near) { hud.toast('No car close enough — walk closer and press E'); return null; }
      if (near.traffic && near.driver !== 'player') {
        near.traffic = false; near.parked = false;
        raiseWanted(st, 1);
        hud.toast(`Stole a ${near.model.name} — the ABPD noticed`);
      } else {
        near.parked = false;
        hud.toast(`Took the ${near.model.name}`);
      }
      st.parked = st.parked.filter((c) => c !== near);
      st.traffic = st.traffic.filter((c) => c !== near);
      p.inCar = near;
      sound.pickup();
      return 'enter';
    },
    startSideJob(kind) {
      const rnd = makeChance(Math.floor(Math.random() * 1e9));
      state.sideJob = kind === 'taxi' ? makeTaxiJob(rnd, state.city) : makeCourierJob(rnd, state.city);
      hud.toast(kind === 'taxi' ? 'Taxi job — pick up the passenger' : 'Courier job — deliver the parcel');
    },
    beginMission() {
      const m = STORY[state.mission.index];
      if (!m) { hud.toast('Story complete — free roam!'); return false; }
      if (state.mission.active) return false;
      startMission(state);
      hud.showBrief(m.title, m.brief);
      return true;
    },
    confirmBrief() {
      hud.hideBrief();
      hud.banner(STORY[state.mission.index]?.title || 'Mission');
      sound.mission();
    },
    raiseWanted(n) { raiseWanted(state, n); },
    payOffWanted() {
      const cost = state.wanted * 150;
      if (state.wanted === 0) { hud.toast('No heat to pay off'); return; }
      if (state.player.cash < cost) { hud.toast(`Fixer wants $${cost} — you cannot afford it`); return; }
      state.player.cash -= cost;
      state.wanted = 0; state.wantedHeat = 0;
      state.policeCars = []; state.cops = [];
      hud.toast('Fixer paid — the heat is gone');
    },
  };
}
