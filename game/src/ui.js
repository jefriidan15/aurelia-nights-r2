// DOM UI: title, HUD, job board, pause, end and win screens, toasts.
// The game logic never touches the DOM directly — it calls these helpers,
// and the helpers call back into G for actions.
import { fmtMoney, fmtClock } from './util.js';
import { MISSIONS } from './missions.js';
import { WEAPONS } from './player.js';
import { hasSave, saveSummary } from './save.js';

const $ = (id) => document.getElementById(id);

export function initUI(G) {
  G.ui = {
    showTitle,
    showHow, showMissions, showPause, showEnd, showWin, hideScreens,
    updateHUD, setObjective, toast, centerMsg, setPrompt,
  };
  $('btn-new').addEventListener('click', () => {
    G.audio.initAudio();
    G.audio.resumeAudio();
    G.newGame();
  });
  $('btn-continue').addEventListener('click', () => {
    G.audio.initAudio();
    G.audio.resumeAudio();
    G.continueGame();
  });
  $('btn-how').addEventListener('click', () => showHow());
  $('btn-how-back').addEventListener('click', () => showTitle());
  $('btn-mission-close').addEventListener('click', () => G.closeMissions());
  $('btn-resume').addEventListener('click', () => G.resume());
  $('btn-save').addEventListener('click', () => {
    const ok = G.save();
    $('pause-save-msg').textContent = ok ? 'Saved. Progress is safe.' : 'Save failed — browser storage blocked.';
  });
  $('btn-quit').addEventListener('click', () => G.quitToTitle());
  $('btn-end-respawn').addEventListener('click', () => G.respawn());
  $('btn-win-close').addEventListener('click', () => {
    hideScreens();
    G.resume();
  });
  refreshTitleSaveInfo();
}

export function refreshTitleSaveInfo() {
  const info = $('save-info');
  const btn = $('btn-continue');
  const s = saveSummary();
  if (s) {
    info.textContent = 'Save found — ' + fmtMoney(s.money) + ', ' + s.jobs + '/6 jobs done, saved ' + new Date(s.savedAt).toLocaleString();
    btn.classList.remove('secondary');
  } else {
    info.textContent = 'No save yet.';
    btn.classList.add('secondary');
  }
}

const SCREENS = ['title-screen', 'how-screen', 'mission-screen', 'pause-screen', 'end-screen', 'win-screen'];

function show(id) {
  for (const s of SCREENS) $(s).classList.add('hidden');
  if (id) $(id).classList.remove('hidden');
  $('hud').classList.toggle('hidden', id === 'title-screen' || id === 'how-screen');
}

export function hideScreens() {
  show(null);
}

export function showTitle() {
  refreshTitleSaveInfo();
  show('title-screen');
}

export function showHow() {
  show('how-screen');
}

export function showPause() {
  $('pause-save-msg').textContent = '';
  show('pause-screen');
}

export function showEnd(title, text) {
  $('end-title').textContent = title;
  $('end-text').textContent = text;
  show('end-screen');
}

export function showWin() {
  show('win-screen');
}

function missionRow(G, m) {
  const done = !!G.completed[m.id];
  const row = document.createElement('button');
  row.className = 'mission-row' + (done ? ' done' : '');
  const num = document.createElement('div');
  num.className = 'mnum';
  num.textContent = m.id;
  const body = document.createElement('div');
  body.className = 'mbody';
  const title = document.createElement('div');
  title.className = 'mname';
  title.textContent = m.name;
  const desc = document.createElement('div');
  desc.className = 'mdesc';
  desc.textContent = m.desc;
  body.appendChild(title);
  body.appendChild(desc);
  const reward = document.createElement('div');
  reward.className = done ? 'mdone' : 'mreward';
  reward.textContent = done ? 'DONE ✓' : fmtMoney(m.reward);
  row.appendChild(num);
  row.appendChild(body);
  row.appendChild(reward);
  row.addEventListener('click', () => {
    if (done) {
      toast("Already done — the money's in your pocket.", '#7dff8a');
      return;
    }
    if (G.mission.active) {
      toast('Finish the current job first.', '#ff9a3d');
      return;
    }
    G.startMission(m.id);
    hideScreens();
    G.resume();
  });
  return row;
}

export function showMissions(G) {
  const list = $('mission-list');
  list.innerHTML = '';
  for (const m of MISSIONS) list.appendChild(missionRow(G, m));
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
  for (let i = 1; i <= 5; i++) {
    stars += '<span class="' + (i <= G.wanted ? '' : 'off') + '">★</span>';
  }
  starsEl.innerHTML = stars;
  $('money').textContent = fmtMoney(p.money);
  $('health-bar').style.width = Math.max(0, p.health) + '%';
  $('health-text').textContent = Math.ceil(p.health);
  const w = WEAPONS[p.weapon] || WEAPONS.none;
  $('ammo').textContent = p.weapon === 'none'
    ? 'No weapon — visit Iron & Oak'
    : w.name + ' — ' + p.ammo + ' rounds';
  $('clock').textContent = fmtClock(G.clock);
  $('speed').textContent = p.onFoot
    ? 'On foot'
    : Math.round(Math.abs(p.speed || 0) * 0.12) + ' mph · ' + (p.car ? p.car.name : '');
  $('jobs').textContent = Object.values(G.completed).filter(Boolean).length + '/6 jobs';
}
