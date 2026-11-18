// HUD, minimap and menu wiring. The HUD is DOM; the minimap is a small
// canvas drawn each frame from the world state.
import { fmtMoney, fmtClock, clamp } from './util.js';
import { WORLD_W, WORLD_H, PLACES } from './world.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.minimap = this.$('minimap');
    this.mm = this.minimap.getContext('2d');
    this.toastTimer = null;
  }

  show(id) { this.$(id).classList.remove('hidden'); }
  hide(id) { this.$(id).classList.add('hidden'); }

  showTitle(canContinue) {
    this.hide('hud');
    this.hide('pause-screen');
    this.hide('end-screen');
    this.hide('how-screen');
    this.show('title-screen');
    if (canContinue) this.show('btn-continue');
    else this.hide('btn-continue');
  }

  showGame() {
    this.hide('title-screen');
    this.hide('pause-screen');
    this.hide('end-screen');
    this.hide('how-screen');
    this.show('hud');
  }

  showPause() { this.show('pause-screen'); }
  hidePause() { this.hide('pause-screen'); }

  showEnd(won, stats) {
    this.hide('hud');
    this.$('end-title').textContent = won ? 'AURELIA IS YOURS' : 'BUSTED OUT';
    this.$('end-text').textContent = won
      ? `All six jobs done. Rook walks out of Port Aurelia with $${fmtMoney(stats.moneyEarned)} earned, ${stats.carsStolen} cars stolen and ${stats.thugsDown} dock men down. The harbour is quiet tonight.`
      : 'The job failed. Get back out there and run it again.';
    this.show('end-screen');
  }

  toast(text, ms = 2600) {
    const el = this.$('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  hint(text) {
    this.$('hint').textContent = text || '';
    this.$('hint').style.display = text ? '' : 'none';
  }

  updateHUD() {
    const g = this.game;
    const p = g.player;
    this.$('money-val').textContent = fmtMoney(p.money);
    this.$('health-fill').style.width = `${clamp(p.health, 0, 100)}%`;
    this.$('health-text').textContent = Math.ceil(p.health);
    const w = p.weaponDef();
    const ammo = p.weapons[p.weapon];
    this.$('ammo').textContent = p.weapon === 'fists'
      ? 'Fists'
      : `${w.name} — ${ammo ? ammo.ammo : 0} rds  [Q switch]`;
    const stars = this.$('wanted');
    let html = '';
    for (let i = 0; i < 5; i++) html += `<span class="star${i < p.wanted ? ' lit' : ''}">★</span>`;
    stars.innerHTML = html;
    this.$('clock').textContent = fmtClock(g.timeOfDay);
    if (g.missions && !g.missions.done) {
      this.$('mission-title').textContent = g.missions.current().title;
      this.$('mission-objective').textContent = g.missions.objectiveText();
      this.$('mission-progress').textContent = g.missions.progressText();
    } else if (g.missions && g.missions.done) {
      this.$('mission-title').textContent = 'ALL MISSIONS COMPLETE';
      this.$('mission-objective').textContent = 'Port Aurelia is yours.';
      this.$('mission-progress').textContent = '';
    }
  }

  drawMinimap() {
    const g = this.game;
    const ctx = this.mm;
    const W = this.minimap.width, H = this.minimap.height;
    const sx = W / WORLD_W, sy = H / WORLD_H;
    ctx.fillStyle = '#0c1420';
    ctx.fillRect(0, 0, W, H);
    // Water.
    ctx.fillStyle = '#1d4e6b';
    ctx.fillRect(2500 * sx, 2450 * sy, (WORLD_W - 2500) * sx, (WORLD_H - 2450) * sy);
    // Roads.
    ctx.fillStyle = '#3a3f4a';
    for (let gx = 0; gx <= 10; gx++) ctx.fillRect(gx * 360 * sx, 0, 72 * sx, H);
    for (let gy = 0; gy <= 7; gy++) ctx.fillRect(0, gy * 360 * sy, W, 72 * sy);
    // Named places.
    ctx.fillStyle = '#ffd75e';
    for (const key of Object.keys(PLACES)) {
      const pl = PLACES[key];
      if (pl.kind === 'start') continue;
      ctx.fillRect(pl.x * sx - 2, pl.y * sy - 2, 4, 4);
    }
    // Mission marker (pulsing).
    const m = g.missions && !g.missions.done ? g.missions.marker() : null;
    if (m) {
      const r = 4 + Math.sin(g.time * 5) * 1.5;
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath(); ctx.arc(m.x * sx, m.y * sy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
    // Police cruisers.
    ctx.fillStyle = '#4d8dff';
    for (const c of g.police.cruisers) ctx.fillRect(c.x * sx - 2, c.y * sy - 2, 4, 4);
    // Thugs.
    ctx.fillStyle = '#ff5a4e';
    for (const t of g.combat.thugs) ctx.fillRect(t.x * sx - 2, t.y * sy - 2, 4, 4);
    // Player arrow.
    const p = g.player;
    ctx.save();
    ctx.translate(p.x * sx, p.y * sy);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
    ctx.restore();
    // Viewport box.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.strokeRect(g.renderer.cam.x * sx, g.renderer.cam.y * sy, 1280 * sx, 800 * sy);
  }
}
