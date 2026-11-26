// NUSA RING RUN — cockpit.js
// Panel instrumen kokpit: enam jam yang MENYALA — airspeed, attitude,
// altimeter, heading, VSI, fuel — digambar di kanvas 2D di bawah kaca depan.
// Jarum bergerak mengikuti state; bukan gambar mati.
import { knots, feet } from './flight.js';

function dial(ctx, cx, cy, r, label, valueText) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#0d1117';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a4552';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = '#8a94a3';
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i += 1) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8));
    ctx.lineTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2));
    ctx.stroke();
  }
  ctx.fillStyle = '#e8f0f8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -r + 20);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(valueText, 0, r - 10);
  ctx.restore();
}

function needle(ctx, cx, cy, r, frac, color) {
  const a = -Math.PI * 0.75 + frac * Math.PI * 1.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color || '#ff5a3c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a) * (r - 12), Math.sin(a) * (r - 12));
  ctx.stroke();
  ctx.restore();
}

export function drawCockpitPanel(canvas, world) {
  const ctx = canvas.getContext('2d');
  const p = world.plane;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  // Panel gelap + tepi atas (glareshield).
  ctx.fillStyle = '#14181f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#0a0d12';
  ctx.fillRect(0, 0, W, 12);
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(0, 12, W, 3);

  const cy = 108;
  const r = 62;
  const xs = [110, 300, 490, 680, 870, 1060];

  // 1. Airspeed.
  dial(ctx, xs[0], cy, r, 'AIRSPEED KT', String(Math.round(knots(p.speed))));
  needle(ctx, xs[0], cy, r, Math.min(1, knots(p.speed) / 220));
  // 2. Attitude (bola horizon kecil).
  ctx.save();
  ctx.translate(xs[1], cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(p.roll);
  const dy = p.pitch * 130;
  ctx.fillStyle = '#3a7bd5';
  ctx.fillRect(-r, -r + dy, r * 2, r);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, dy, r * 2, r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, dy);
  ctx.lineTo(r, dy);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#3a4552';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(xs[1], cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8f0f8';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', xs[1], cy - r + 20);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xs[1] - 22, cy);
  ctx.lineTo(xs[1] + 22, cy);
  ctx.stroke();
  // 3. Altimeter.
  dial(ctx, xs[2], cy, r, 'ALT FT', String(Math.round(feet(p.y))));
  needle(ctx, xs[2], cy, r, (feet(p.y) % 1000) / 1000);
  needle(ctx, xs[2], cy, r - 18, (feet(p.y) % 10000) / 10000, '#ffd23f');
  // 4. Heading.
  const hdgDeg = Math.round(((p.heading * 57.2958) % 360 + 360) % 360);
  dial(ctx, xs[3], cy, r, 'HEADING', `${String(hdgDeg).padStart(3, '0')}°`);
  needle(ctx, xs[3], cy, r, hdgDeg / 360, '#7fd4ff');
  // 5. VSI.
  const vsiFpm = Math.round(feet(p.verticalSpeed));
  dial(ctx, xs[4], cy, r, 'VERT FPM', `${vsiFpm >= 0 ? '+' : ''}${vsiFpm}`);
  needle(ctx, xs[4], cy, r, Math.max(0, Math.min(1, 0.5 + vsiFpm / 2000)));
  // 6. Fuel + damage. Lencana DMG digambar DI BAWAH jam sebagai pil
  // terpisah — dulu teks DMG ditulis di dalam jam dan menumpuk di atas
  // angka FUEL; tidak ada lagi teks yang ditulis di dalam lingkaran jam.
  dial(ctx, xs[5], cy, r, 'FUEL %', `${Math.round(p.fuel)}%`);
  needle(ctx, xs[5], cy, r, p.fuel / 100, p.fuel < 25 ? '#ff2222' : '#2ecc40');
  const dmgText = `DMG ${Math.round(p.damage)}%`;
  ctx.font = 'bold 12px monospace';
  const dmgW = ctx.measureText(dmgText).width + 16;
  ctx.fillStyle = p.damage > 60 ? '#ff4444' : '#ff8c1a';
  ctx.beginPath();
  ctx.roundRect(xs[5] - dmgW / 2, cy + r + 2, dmgW, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#14181f';
  ctx.textAlign = 'center';
  ctx.fillText(dmgText, xs[5], cy + r + 14);

  // Lampu status kanan bawah panel.
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = p.gear ? '#2ecc40' : '#8a94a3';
  ctx.fillText(`GEAR ${p.gear ? 'DOWN ●' : 'UP ○'}`, 1180, 40);
  ctx.fillStyle = p.flaps ? '#2ecc40' : '#8a94a3';
  ctx.fillText(`FLAPS ${p.flaps ? 'ON ●' : 'OFF ○'}`, 1180, 62);
  ctx.fillStyle = '#e8f0f8';
  ctx.fillText(`SKOR ${world.score}`, 1180, 84);
  ctx.fillText(`RING ${world.nextRing}/10`, 1180, 106);
}

/** Jam mini untuk strip bawah chase view (r kecil, label + angka di dalam). */
function miniDial(ctx, cx, cy, r, label, valueText) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#0d1117';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a4552';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#8a94a3';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5));
    ctx.lineTo(Math.cos(a) * (r - 1), Math.sin(a) * (r - 1));
    ctx.stroke();
  }
  ctx.fillStyle = '#e8f0f8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -r + 13);
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(valueText, 0, r - 7);
  ctx.restore();
}

function miniNeedle(ctx, cx, cy, r, frac, color) {
  const a = -Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = color || '#ff5a3c';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a) * (r - 8), Math.sin(a) * (r - 8));
  ctx.stroke();
  ctx.restore();
}

function stripBar(ctx, x, y, w, label, frac, color) {
  ctx.fillStyle = '#9fc6e8';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 10);
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(x + 44, y, w, 12);
  ctx.fillStyle = color;
  ctx.fillRect(x + 44, y, Math.max(0, Math.min(1, frac)) * w, 12);
  ctx.strokeStyle = '#3a4552';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 44, y, w, 12);
  ctx.fillStyle = '#e8f0f8';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.round(frac * 100)}%`, x + 44 + w + 34, y + 10);
  ctx.textAlign = 'left';
}

/**
 * Strip instrumen bawah untuk chase view — pola cover pemenang (6 jam +
 * bilah status di kanan): AIRSPEED, ATTITUDE, ALT, HEADING, FUEL, THR,
 * lalu FUEL/DMG/THR + GEAR/FLAPS/ANGIN/SKOR/RING. Digambar di kanvas
 * 1280x112 yang menempel di bawah viewport; di kokpit tidak dipakai
 * (panel kokpit sudah menempati bawah layar).
 */
export function drawGaugeStrip(canvas, world) {
  const ctx = canvas.getContext('2d');
  const p = world.plane;
  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#14181f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a2f38';
  ctx.fillRect(0, 0, W, 3);

  const cy = 58;
  const r = 36;
  const xs = [64, 196, 328, 460, 592, 724];

  miniDial(ctx, xs[0], cy, r, 'AIRSPEED', String(Math.round(knots(p.speed))));
  miniNeedle(ctx, xs[0], cy, r, knots(p.speed) / 220);
  // Attitude: bola horizon mini.
  ctx.save();
  ctx.translate(xs[1], cy);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.rotate(p.roll);
  const dy = p.pitch * 70;
  ctx.fillStyle = '#3a7bd5';
  ctx.fillRect(-r, -r + dy, r * 2, r);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-r, dy, r * 2, r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-r, dy);
  ctx.lineTo(r, dy);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#3a4552';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(xs[1], cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#e8f0f8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', xs[1], cy - r + 13);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xs[1] - 14, cy);
  ctx.lineTo(xs[1] + 14, cy);
  ctx.stroke();

  miniDial(ctx, xs[2], cy, r, 'ALT FT', String(Math.round(feet(p.y))));
  miniNeedle(ctx, xs[2], cy, r, (feet(p.y) % 1000) / 1000);
  const hdgDeg = Math.round(((p.heading * 57.2958) % 360 + 360) % 360);
  miniDial(ctx, xs[3], cy, r, 'HEADING', `${String(hdgDeg).padStart(3, '0')}°`);
  miniNeedle(ctx, xs[3], cy, r, hdgDeg / 360, '#7fd4ff');
  miniDial(ctx, xs[4], cy, r, 'FUEL %', `${Math.round(p.fuel)}%`);
  miniNeedle(ctx, xs[4], cy, r, p.fuel / 100, p.fuel < 25 ? '#ff2222' : '#2ecc40');
  miniDial(ctx, xs[5], cy, r, 'THR %', `${Math.round(p.throttle * 100)}%`);
  miniNeedle(ctx, xs[5], cy, r, p.throttle, '#ffd23f');

  // Blok status kanan: bilah + kondisi pesawat + skor.
  const bx = 800;
  stripBar(ctx, bx, 14, 300, 'FUEL', p.fuel / 100, p.fuel < 25 ? '#ff2222' : '#2ecc40');
  stripBar(ctx, bx, 36, 300, 'DMG', p.damage / 100, p.damage > 60 ? '#ff4444' : '#ff8c1a');
  stripBar(ctx, bx, 58, 300, 'THR', p.throttle, '#ffd23f');
  ctx.fillStyle = '#c8d6e2';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(
    `GEAR ${p.gear ? 'DOWN ●' : 'UP ○'} · FLAPS ${p.flaps ? 'ON ●' : 'OFF ○'} · ANGIN ${Math.round(Math.hypot(world.wind.x, world.wind.z) * 1.94)}KT · SKOR ${world.score} · RING ${world.nextRing}/10`,
    bx, 88,
  );
  ctx.fillStyle = p.fuel < 25 ? '#ff4444' : '#2ecc40';
  ctx.font = 'bold 11px monospace';
  ctx.fillText(
    p.fuel < 25 ? 'LOW FUEL — DIVERT KE STRIP RUMPUT!' : p.damage > 60 ? 'DMG KRITIS — MENDARAT SEKARANG' : `ELANG NUSA · WAKTU ${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')} · KOMBO x${world.combo}`,
    bx, 106,
  );
}
