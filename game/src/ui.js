// DOM UI: title, HUD, mission board, pause, shop prompts, toasts.
// The game logic never touches the DOM directly — it calls these helpers.
import { fmtMoney, fmtClock } from './util.js';
import { MISSIONS } from './missions.js';
import { hasSave, loadSave } from './save.js';

const $ = (id) => document.getElementById(id);

export function initUI(G) {
  G.ui = {
    showTitle,
    showHow, showMissions, showPause, showEnd, showWin, hideScreens,
    updateHUD, setObjective, toast, centerMsg, setPrompt,
  };
  $('btn-new').addEventListener('click', () => { G.audio.initAudio(); G.audio.resumeAudio(); G.newGame(); });
  $('btn-continue').addEventListener('click', () => {
    G.audio.initAudio(); G.audio.resumeAudio();
    G.continueGame();
  });
  $('btn-how').addEventListener('click', () => { showHow(); });
  $('btn-how-back').addEventListener('click', () => { showTitle(); });
  $('btn-mission-close').addEventListener('click', () => { G.closeMissions(); });
  $('btn-resume').addEventListener('click', () => { G.resume(); });
  $('btn-save').addEventListener('click', () => {
    const ok = G.save();
    $('pause-save-msg').textContent = ok ? 'Saved. Progress is safe.' : 'Save failed — browser storage blocked.';
  });
  $('btn-quit').addEventListener('click', () => { G.quitToTitle(); });
  $('btn-end-respawn').addEventListener('click', () => { G.respawn(); });
  $('btn-win-close').addEventListener('click', () => { hideScreens(); G.resume(); });
  refreshTitleSaveInfo();
}

export function refreshTitleSaveInfo() {
  const info = $('save-info');
  const btn = $('btn-continue');
  if (hasSave()) {
    const d = loadSave();
    const done = Object.values(d.completed || {}).filter(Boolean).length;
    info.textContent = 'Save found — ' + fmtMoney(d.money) + ', ' + done + '/6 jobs done, saved ' + new Date(d.savedAt).toLocaleString();
    btn.classList.remove('secondary');
  } else {
    info.textContent = 'No save yet.';
    btn.classList.add('secondary');
  }
}

function show(id) {
  for (const s of ['title-screen', 'how-screen', 'mission-screen', 'pause-screen', 'end-screen', 'win-screen']) $(s).classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
  $('hud').classList.toggle('hidden', id === 'title-screen' || id === 'how-screen');
}
export function hideScreens() { show(null); }
export function showTitle() { refreshTitleSaveInfo(); show('title-screen'); }
export function showHow() { show('how-screen'); }
export function showPause() { $('pause-save-msg').textContent = ''; show('pause-screen'); }
export function showEnd(title, text) {
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  show('end-screen');
}
export function showWin() { show('win-screen'); }

export function showMissions(G) {
  const list = $('mission-list');
  list.innerHTML = '';
  for (const m of MISSIONS) {
    const done = !!G.completed[m.id];
    const row = document.createElement('button');
    row.className = 'mission-row' + (done ? ' done' : '');
    row.innerHTML =
      '<div class="num">' + m.id + '</div>' +
      '<div class="mbody"><div class="mname">' + m.name + '</div>' +
      '<div class="mdesc">' + m.desc + '</div></div>' +
      (done ? '<div class="mdone">DONE ✓</div>' : '<div class="mreward">' + fmtMoney(m.reward) + '</div>');
    row.addEventListener('click', () => {
      if (done) { toast('Already done — the money\'s in your pocket.', '#7dff8a'); return; }
      if (G.mission.active) { toast('Finish the current job first.', '#ff9a3d'); return; }
      G.startMission(m.id);
      hideScreens();
      G.resume();
    });
    list.appendChild(row);
  }
  show('mission-screen');
}

let toastTimer = null;
export function toast(msg, color) {
  const el = $('toast');
  el.textContent = msg;
  el.style.color = color || '#ffe9a8';
  el.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2600);
}

let centerTimer = null;
export function centerMsg(msg, seconds) {
  const el = $('center-msg');
  el.textContent = msg;
  clearTimeout(centerTimer);
  centerTimer = setTimeout(() => { el.textContent = ''; }, (seconds || 2.5) * 1000);
}

export function setPrompt(text) {
  $('prompt').textContent = text || '';
}

export function setObjective(title, text) {
  $('objective-title').textContent = title;
  $('objective-text').textContent = text;
}

export function updateHUD(G) {
  const p = G.player;
  const starsEl = $('stars');
  let stars = '';
  for (let i = 1; i <= 5; i++) stars += '<span class="' + (i <= G.wanted ? '' : 'off') + '">★</span>';
  starsEl.innerHTML = stars;
  $('money').textContent = fmtMoney(p.money);
  $('health-bar').style.width = Math.max(0, p.health) + '%';
  $('health-text').textContent = Math.ceil(p.health);
  $('ammo').textContent = p.hasGun ? '🔫 Pistol — ' + p.ammo + ' rounds' : 'No weapon — visit Iron & Oak';
  $('clock').textContent = fmtClock(G.clock);
  $('speed').textContent = p.onFoot ? 'On foot' : Math.round(Math.abs(p.speed || 0) * 0.12) + ' mph · ' + (p.car ? p.car.name : '');
}
