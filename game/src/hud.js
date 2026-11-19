// Aurelia Nights — HUD: DOM readouts, live minimap, toasts and banners.
import { fmtCash } from './rngkit.js';
import { districtAt } from './city.js';
import { WEAPONS } from './combat.js';
import { currentObjective } from './jobs.js';

const $ = (id) => document.getElementById(id);

export function makeHud() {
  let toastTimer = null, bannerTimer = null;
  return {
    showGame() {
      $('menu').classList.add('hidden');
      $('pause').classList.add('hidden');
      $('endcard').classList.add('hidden');
      $('brief').classList.add('hidden');
      $('hud').classList.remove('hidden');
    },
    showMenu() {
      $('hud').classList.add('hidden');
      $('menu').classList.remove('hidden');
      $('pause').classList.add('hidden');
      $('endcard').classList.add('hidden');
    },
    showPause(statsText) {
      $('pause-stats').textContent = statsText;
      $('pause').classList.remove('hidden');
    },
    hidePause() { $('pause').classList.add('hidden'); },
    showEnd(title, text) {
      $('end-title').textContent = title;
      $('end-text').textContent = text;
      $('endcard').classList.remove('hidden');
    },
    hideEnd() { $('endcard').classList.add('hidden'); },
    showBrief(title, body) {
      $('brief-title').textContent = title;
      $('brief-body').textContent = body;
      $('brief').classList.remove('hidden');
    },
    hideBrief() { $('brief').classList.add('hidden'); },
    toast(text) {
      const el = $('toast');
      el.textContent = text;
      el.style.opacity = '1';
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
    },
    banner(text) {
      const el = $('banner');
      el.textContent = text;
      el.classList.remove('hidden');
      clearTimeout(bannerTimer);
      bannerTimer = setTimeout(() => el.classList.add('hidden'), 2400);
    },
    setHint(text) { $('hint').textContent = text || ''; },
    update(state) {
      const p = state.player;
      // Wanted stars
      const stars = $('wanted');
      let html = '';
      for (let i = 0; i < 5; i++) html += `<span class="${i < state.wanted ? 'lit' : 'dim'}">★</span>`;
      stars.innerHTML = html;
      $('cash').textContent = fmtCash(p.cash);
      $('respect').textContent = `REP ${p.respect}`;
      const hh = String(Math.floor(state.clockMinutes / 60) % 24).padStart(2, '0');
      const mm = String(Math.floor(state.clockMinutes % 60)).padStart(2, '0');
      $('clock').textContent = `${hh}:${mm}`;
      const px = p.inCar ? p.inCar.x : p.x;
      const py = p.inCar ? p.inCar.y : p.y;
      $('district').textContent = districtAt(state.city, px, py);
      $('healthbar').style.width = `${Math.max(0, p.health)}%`;
      $('healthbar').style.background = p.health < 25
        ? 'linear-gradient(90deg,#d21f2b,#ff5f4d)'
        : 'linear-gradient(90deg,#37d67a,#7dff9b)';
      $('armorbar').style.width = `${Math.max(0, p.armor)}%`;
      const w = WEAPONS[p.weapon];
      $('weapon').textContent = w ? w.name : p.weapon;
      $('ammo').textContent = w && w.ammo !== Infinity ? `· ${p.ammo[w.ammo] ?? 0} rounds` : '';
      $('speed').textContent = p.inCar ? String(Math.round(Math.abs(p.inCar.speed) * 0.36)) : '0';
      $('carline').textContent = p.inCar ? p.inCar.model.name : 'On foot — press E near a car to steal it';
      $('obj-text').textContent = currentObjective(state);
      this.drawMinimap(state);
    },
    drawMinimap(state) {
      const cv = $('minimap');
      const ctx = cv.getContext('2d');
      const W = cv.width, H = cv.height;
      const sx = W / 3600, sy = H / 2800;
      ctx.fillStyle = '#10182a';
      ctx.fillRect(0, 0, W, H);
      // water / beach
      ctx.fillStyle = '#1d4e63';
      ctx.fillRect(0, H * 0.93, W, H * 0.07);
      // roads
      ctx.strokeStyle = '#3a4358';
      ctx.lineWidth = 2;
      for (const rx of state.city.roadsV) { ctx.beginPath(); ctx.moveTo(rx * sx, 0); ctx.lineTo(rx * sx, H); ctx.stroke(); }
      for (const ry of state.city.roadsH) { ctx.beginPath(); ctx.moveTo(0, ry * sy); ctx.lineTo(W, ry * sy); ctx.stroke(); }
      // buildings
      ctx.fillStyle = '#5a6278';
      for (const b of state.city.buildings) ctx.fillRect(b.x * sx, b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
      // objective marker
      const target = state.objectivePos;
      if (target) {
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath(); ctx.arc(target.x * sx, target.y * sy, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(target.x * sx, target.y * sy, 8, 0, Math.PI * 2); ctx.stroke();
      }
      // police blips
      ctx.fillStyle = '#4d9fff';
      for (const car of state.policeCars) ctx.fillRect(car.x * sx - 2, car.y * sy - 2, 4, 4);
      // player arrow
      const p = state.player;
      const px = (p.inCar ? p.inCar.x : p.x) * sx;
      const py = (p.inCar ? p.inCar.y : p.y) * sy;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ffd23e'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2); ctx.stroke();
    },
  };
}
