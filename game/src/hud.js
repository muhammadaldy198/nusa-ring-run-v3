// NUSA RING RUN — hud.js
// Semua teks dan panel 2D di atas viewport 3D. HUD adalah separuh entry:
// ALT/SPD/HDG besar, throttle + fuel + damage, horizon, ring berikutnya,
// skor, timer, dan WIN/LOSE tertulis — semuanya dalam SATU frame cover.
import { targetInfo } from './world.js';
import { knots, feet } from './flight.js';
import { drawCockpitPanel, drawGaugeStrip } from './cockpit.js';

function el(tag, id, parent, cls) {
  const d = document.createElement(tag);
  if (id) d.id = id;
  if (cls) d.className = cls;
  parent.appendChild(d);
  return d;
}

function bar(parent, label) {
  const wrap = el('div', '', parent, 'barwrap');
  el('span', '', wrap, 'barlabel').textContent = label;
  const track = el('div', '', wrap, 'bartrack');
  const fill = el('div', '', track, 'barfill');
  const val = el('span', '', wrap, 'barval');
  return { fill, val };
}

export function createHud(container) {
  const root = el('div', 'hud', container);

  const tl = el('div', '', root, 'panel tl');
  const title = el('div', '', tl, 'gametitle');
  title.textContent = 'NUSA RING RUN';
  const sub = el('div', '', tl, 'subtitle');
  sub.textContent = 'ELANG NUSA · KEPULAUAN MERAPI';
  const mission = el('div', '', tl, 'mission');
  const goal = el('div', '', tl, 'goal');
  const winlose = el('div', '', tl, 'winlose');

  const tc = el('div', '', root, 'panel tc');
  const compass = el('div', '', tc, 'compass');
  const target = el('div', '', tc, 'target');

  const tr = el('div', '', root, 'panel tr');
  const score = el('div', '', tr, 'score');
  const rings = el('div', '', tr, 'rings');
  const timer = el('div', '', tr, 'timer');
  const combo = el('div', '', tr, 'combo');

  const bl = el('div', '', root, 'panel bl');
  const alt = el('div', '', bl, 'big');
  const spd = el('div', '', bl, 'big');
  const hdg = el('div', '', bl, 'big');
  const vsi = el('div', '', bl, 'small');
  const thr = bar(bl, 'THR');
  const fuel = bar(bl, 'FUEL');
  const dmg = bar(bl, 'DMG');
  const lights = el('div', '', bl, 'lights');

  const bc = el('div', '', root, 'panel bc');
  const horizon = document.createElement('canvas');
  horizon.width = 180;
  horizon.height = 88;
  horizon.id = 'horizon';
  bc.appendChild(horizon);
  const horLabel = el('div', '', bc, 'horlabel');
  horLabel.textContent = 'ATTITUDE';

  const center = el('div', '', root, 'center');
  const flash = el('div', '', center, 'flash');
  const msg = el('div', '', center, 'msg');

  const banner = el('div', '', root, 'banner');

  const result = el('div', '', root, 'panel result');
  result.style.display = 'none';
  const resultTitle = el('div', '', result, 'resulttitle');
  const resultBody = el('div', '', result, 'resultbody');

  const titleScreen = el('div', '', root, 'panel titlescreen');
  const tsTitle = el('div', '', titleScreen, 'tstitle');
  tsTitle.textContent = 'NUSA RING RUN';
  const tsSub = el('div', '', titleScreen, 'tssub');
  tsSub.textContent = 'ELANG NUSA · KEPULAUAN MERAPI · GOLDEN HOUR';
  const tsMissions = el('div', '', titleScreen, 'tsmissions');
  const tsHelp = el('div', '', titleScreen, 'tshelp');
  tsHelp.innerHTML =
    'W/S pitch · A/D roll · Q/E yaw · SHIFT/CTRL throttle · F flaps · G gear · B rem · C kamera · M peta · P jeda<br>' +
    'Misi: <b>1</b> RING RUN (10 ring + mendarat) · <b>2</b> ISLAND HOP (kargo 3 pulau) · <b>3</b> STORM RESCUE (badai)<br>' +
    'Tekan ENTER atau klik untuk terbang.';

  const cockpitPanel = el('div', '', root, 'cockpit');
  cockpitPanel.style.display = 'none';
  const cpCanvas = document.createElement('canvas');
  cpCanvas.width = 1280;
  cpCanvas.height = 190;
  cpCanvas.id = 'cockpitCanvas';
  cockpitPanel.appendChild(cpCanvas);

  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 220;
  mapCanvas.height = 220;
  mapCanvas.id = 'minimap';
  mapCanvas.style.display = 'none';
  root.appendChild(mapCanvas);

  // Checklist misi v2 — 10 ring bernama, selalu terlihat di chase view
  // (pola cover pemenang: misi tertulis di frame, bukan tersirat).
  const checklist = el('div', '', root, 'panel checklist');
  checklist.style.display = 'none';
  const ckHead = el('div', '', checklist, 'ckhead');
  ckHead.textContent = 'DAFTAR RING — 10 GERBANG';
  const ckRows = [];
  for (let i = 0; i < 10; i += 1) {
    ckRows.push(el('div', '', checklist, 'ckrow todo'));
  }
  const ckFoot = el('div', '', checklist, 'ckfoot');
  ckFoot.textContent = 'LEWATI SEMUA → MENDARAT DI NUSA';

  // Strip instrumen bawah v2 — 6 jam + bilah status, hanya di chase view.
  const stripWrap = el('div', '', root, 'strip');
  stripWrap.style.display = 'none';
  const stripCanvas = document.createElement('canvas');
  stripCanvas.width = 1280;
  stripCanvas.height = 112;
  stripWrap.appendChild(stripCanvas);

  return {
    root, title, mission, goal, winlose, compass, target, score, rings,
    timer, combo, alt, spd, hdg, vsi, thr, fuel, dmg, lights, horizon,
    flash, msg, banner, result, resultTitle, resultBody, titleScreen,
    tsMissions, cockpitPanel, cpCanvas, mapCanvas, sub, checklist, ckRows,
    ckFoot, stripWrap, stripCanvas,
  };
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function arrowFor(rel) {
  if (Math.abs(rel) < 0.35) return '▲';
  if (rel > 0) return '▶';
  return '◀';
}

/** Gambar horizon buatan + pitch ladder di kanvas kecil. */
function drawHorizon(canvas, p) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(p.roll);
  const dy = p.pitch * 120;
  ctx.fillStyle = '#3a7bd5';
  ctx.fillRect(-w, -h + dy, w * 2, h);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-w, dy, w * 2, h);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w, dy);
  ctx.lineTo(w, dy);
  ctx.stroke();
  // Pitch ladder (hanya yang masih di dalam kanvas).
  ctx.lineWidth = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = '10px monospace';
  for (const deg of [-20, -10, 10, 20]) {
    const y = dy - (deg * Math.PI / 180) * 120;
    if (Math.abs(y) > h / 2 - 8) continue;
    ctx.beginPath();
    ctx.moveTo(-34, y);
    ctx.lineTo(34, y);
    ctx.stroke();
    ctx.fillText(`${deg > 0 ? '+' : ''}${deg}`, 40, y + 3);
  }
  ctx.restore();
  // Pesawat tetap di tengah.
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w / 2 - 26, h / 2);
  ctx.lineTo(w / 2 - 8, h / 2);
  ctx.moveTo(w / 2 + 8, h / 2);
  ctx.lineTo(w / 2 + 26, h / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
}

/** Gambar peta kecil: pulau, runway, ring, pesawat. */
function drawMinimap(canvas, world) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const S = w / 3600;
  const toX = (x) => w / 2 + x * S;
  const toY = (z) => h / 2 + z * S;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(8, 20, 34, 0.85)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#1f6f8f';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#4d8a3f';
  for (const isl of [
    { x: 0, z: 0, r: 1150 }, { x: 1560, z: -1180, r: 420 }, { x: -1520, z: 950, r: 520 },
  ]) {
    ctx.beginPath();
    ctx.arc(toX(isl.x), toY(isl.z), isl.r * S, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3c3f45';
  ctx.fillRect(toX(-350), toY(720) - 3, 700 * S, 6);
  ctx.fillStyle = '#7fae56';
  ctx.fillRect(toX(1560 - 210), toY(-1180) - 2, 420 * S, 4);
  if (world.rings) {
    world.rings.forEach((r, i) => {
      ctx.beginPath();
      ctx.arc(toX(r.x), toY(r.z), 4, 0, Math.PI * 2);
      ctx.fillStyle = r.passed ? '#2ecc40' : i === world.nextRing ? '#ff8c1a' : '#8899aa';
      ctx.fill();
    });
  }
  const p = world.plane;
  ctx.save();
  ctx.translate(toX(p.x), toY(p.z));
  ctx.rotate(Math.PI - p.heading);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px monospace';
  ctx.fillText('PETA — M', 8, 14);
}

export function updateHud(hud, world, cameraMode, showMap) {
  const p = world.plane;
  const m = world.mission;
  hud.mission.textContent = `MISI ${m.id.toUpperCase()} — ${m.name}`;
  hud.goal.textContent = m.goal;
  hud.winlose.textContent = `${m.winLine}  ·  ${m.loseLine}`;

  const hdgDeg = Math.round(((p.heading * 57.2958) % 360 + 360) % 360);
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  hud.compass.textContent = `HDG ${String(hdgDeg).padStart(3, '0')}°  ${dirs[Math.round(hdgDeg / 45) % 8]}  ·  ALT ${Math.round(feet(p.y))} FT  ·  SPD ${Math.round(knots(p.speed))} KT`;
  const ti = targetInfo(world);
  if (ti) {
    hud.target.textContent = `${arrowFor(ti.relBearing)}  BERIKUTNYA: ${ti.name} · ${Math.round(ti.dist)} m`;
  } else if (world.status === 'won' || world.status === 'crashed') {
    hud.target.textContent = world.status === 'won' ? '★ MISI SELESAI ★' : '✕ MISI GAGAL';
  } else {
    hud.target.textContent = 'MENUJU LANDASAN — SIAP MENDARAT';
  }

  hud.score.textContent = `SKOR ${world.score}`;
  hud.rings.textContent = m.id === 'hop'
    ? `KARGO ${world.deliveries}/3`
    : `RING ${world.nextRing}/10`;
  hud.timer.textContent = `WAKTU ${fmtTime(world.time)}`;
  hud.combo.textContent = world.combo > 1 ? `KOMBO x${world.combo}` : '';

  hud.alt.innerHTML = `ALT <b>${Math.round(feet(p.y))} FT</b>`;
  hud.spd.innerHTML = `SPD <b>${Math.round(knots(p.speed))} KT</b>`;
  hud.hdg.innerHTML = `HDG <b>${String(hdgDeg).padStart(3, '0')}°</b>`;
  hud.vsi.textContent = `VS ${p.verticalSpeed >= 0 ? '+' : ''}${Math.round(feet(p.verticalSpeed))} FPM · ${p.airborne ? 'TERBANG' : p.landed ? 'MENDARAT' : 'DI DARAT'}`;
  hud.thr.fill.style.width = `${Math.round(p.throttle * 100)}%`;
  hud.thr.val.textContent = `${Math.round(p.throttle * 100)}%`;
  hud.fuel.fill.style.width = `${Math.round(p.fuel)}%`;
  hud.fuel.fill.style.background = p.fuel < 25 ? '#e33' : '#2ecc40';
  hud.fuel.val.textContent = `${Math.round(p.fuel)}%`;
  hud.dmg.fill.style.width = `${Math.round(p.damage)}%`;
  hud.dmg.fill.style.background = p.damage > 60 ? '#e33' : '#ff8c1a';
  hud.dmg.val.textContent = `${Math.round(p.damage)}%`;
  hud.lights.textContent =
    `FLAPS ${p.flaps ? '● ON' : '○ OFF'} · GEAR ${p.gear ? '● DOWN' : '○ UP'} · ANGIN ${Math.round(Math.hypot(world.wind.x, world.wind.z) * 1.94)}KT`;

  drawHorizon(hud.horizon, p);

  hud.flash.textContent = world.time < world.flashUntil ? world.flash : '';
  hud.msg.textContent = world.time < world.messageUntil ? world.message : '';

  if (world.result) {
    const r = world.result;
    hud.banner.textContent = r.won ? '★ MENANG — MISI SELESAI ★' : '✕ KALAH — ELANG NUSA JATUH ✕';
    hud.banner.className = `banner ${r.won ? 'win' : 'lose'}`;
    hud.result.style.display = 'block';
    hud.resultTitle.textContent = r.won ? 'MENANG — MISI SELESAI' : 'KALAH';
    hud.resultTitle.className = `resulttitle ${r.won ? 'win' : 'lose'}`;
    hud.resultBody.innerHTML =
      `${r.reason}<br>SKOR <b>${r.score}</b> · WAKTU ${fmtTime(r.time)} · RING ${r.rings}/10<br>` +
      `BAHAN BAKAR SISA ${r.fuel}% · KERUSAKAN ${r.damage}% · KOMBO TERBAIK x${r.bestCombo}<br>` +
      `BONUS WAKTU +${r.timeBonus} · BONUS BAHAN BAKAR +${r.fuelBonus}<br>` +
      `<span class="again">Tekan ENTER untuk terbang lagi.</span>`;
  } else {
    hud.banner.textContent = '';
    hud.banner.className = 'banner';
    hud.result.style.display = 'none';
  }

  hud.titleScreen.style.display = world.status === 'title' ? 'block' : 'none';
  const cockpitOn = cameraMode === 'cockpit' && world.status !== 'title';
  const chaseOn = cameraMode === 'chase' && world.status !== 'title';
  hud.root.classList.toggle('cockpit-on', cockpitOn);
  hud.root.classList.toggle('chase-on', chaseOn);
  hud.cockpitPanel.style.display = cockpitOn ? 'block' : 'none';
  if (cockpitOn) {
    drawCockpitPanel(hud.cpCanvas, world);
  }
  // v2: strip gauge + checklist + minimap SELALU tampil di chase view —
  // cover v1 kalah padat justru karena ketiganya tersembunyi / tidak ada.
  hud.stripWrap.style.display = chaseOn ? 'block' : 'none';
  if (chaseOn) drawGaugeStrip(hud.stripCanvas, world);
  hud.checklist.style.display = chaseOn ? 'block' : 'none';
  if (chaseOn && world.rings) {
    world.rings.forEach((r, i) => {
      const row = hud.ckRows[i];
      if (!row) return;
      const mark = r.passed ? '✓' : i === world.nextRing ? '▶' : '·';
      row.textContent = `${mark} ${i + 1}. ${r.name}`;
      row.className = `ckrow ${r.passed ? 'done' : i === world.nextRing ? 'next' : 'todo'}`;
    });
    hud.ckFoot.textContent = world.nextRing >= 10
      ? 'SEMUA RING LEWAT → MENDARAT DI NUSA'
      : `BERIKUTNYA: ${world.rings[world.nextRing].name}`;
  }
  const mapOn = world.status !== 'title' && (chaseOn || showMap);
  hud.mapCanvas.style.display = mapOn ? 'block' : 'none';
  if (mapOn) drawMinimap(hud.mapCanvas, world);
}

/** Isi daftar misi di layar judul; `selected` = id misi aktif. */
export function renderTitleMissions(hud, selected) {
  const items = [
    ['ring', '1 — RING RUN', '10 ring bernama + mendarat · skor waktu'],
    ['hop', '2 — ISLAND HOP', 'Antar kargo ke 3 pulau · kelola bahan bakar'],
    ['storm', '3 — STORM RESCUE', '10 ring dalam badai · jarak pandang 700 m'],
  ];
  hud.tsMissions.innerHTML = items.map(([id, name, desc]) =>
    `<div class="tsmission${id === selected ? ' sel' : ''}">${name}<span>${desc}</span></div>`).join('');
}
