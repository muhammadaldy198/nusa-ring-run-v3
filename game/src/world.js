// NUSA RING RUN — world.js (v3)
// State permainan + skor + bahan bakar + kerusakan + kondisi menang/kalah.
// world.js tidak menggambar apa-apa: ia hanya memajukan angka, render.js
// dan hud.js yang menampilkannya.
// v3: kolom asap kebakaran = zona bahaya — terbang menembusnya merusak
// pesawat (keputusan: memutar atau menembus), bukan sekadar pemandangan.
import { createPlaneState, stepFlight, knots } from './flight.js';
import { groundHeight, isOnStrip } from './terrain.js';
import { createRingCourse, checkRingPass } from './rings.js';
import { SCORE, WORLD, MISSIONS } from './config.js';

export const STEP = 1 / 60;

export function createWorld(missionId, seed) {
  const mission = MISSIONS[missionId] || MISSIONS.ring;
  return {
    mission,
    seed,
    plane: createPlaneState(),
    rings: null, // diisi world.attachScene (butuh THREE)
    nextRing: 0,
    deliveries: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    time: 0,
    message: '',
    messageUntil: 0,
    flash: '',
    flashUntil: 0,
    status: 'title', // title | flying | landed | crashed | won
    started: false,
    inSmoke: false,
    wind: mission.wind ? { x: mission.wind * 0.6, z: -mission.wind * 0.4 } : { x: 1.5, z: 0.5 },
    hopStops: [
      { name: 'PULAU RUMPUT', x: WORLD.grassStrip.x, z: WORLD.grassStrip.z, done: false },
      { name: 'PULAU KARANG', x: -1520, z: 950, done: false },
      { name: 'LAPANGAN NUSA', x: WORLD.runway.x, z: WORLD.runway.z, done: false },
    ],
    hopIndex: 0,
    result: null,
  };
}

export function attachRings(world, THREE) {
  world.rings = createRingCourse(THREE, world.mission);
  return world.rings;
}

/** Posisi awal: di ujung runway, menghadap timur (heading 90°). */
export function resetWorld(world) {
  const p = world.plane;
  p.x = WORLD.runway.x - WORLD.runway.length / 2 + 60;
  p.y = 6 + 1.2;
  p.z = WORLD.runway.z;
  p.heading = Math.PI / 2;
  p.pitch = 0;
  p.roll = 0;
  p.speed = 0;
  p.throttle = 0;
  p.flaps = false;
  p.gear = true;
  p.brake = false;
  p.fuel = 100;
  p.damage = 0;
  p.verticalSpeed = 0;
  p.airborne = false;
  p.crashed = false;
  p.landed = false;
  world.nextRing = 0;
  world.deliveries = 0;
  world.score = 0;
  world.combo = 0;
  world.bestCombo = 0;
  world.time = 0;
  world.status = 'title';
  world.started = false;
  world.inSmoke = false;
  world.result = null;
  world.message = '';
  world.flash = '';
  for (const r of world.rings) r.passed = false;
  for (const s of world.hopStops) s.done = false;
  world.hopIndex = 0;
  return world;
}

export function startFlight(world) {
  world.started = true;
  world.status = 'flying';
  world.time = 0;
  setMessage(world, `MISI: ${world.mission.name} — ${world.mission.goal}`, 6);
}

/** Pesan HUD tengah yang hilang sendiri setelah `seconds`. */
export function setMessage(world, text, seconds) {
  world.message = text;
  world.messageUntil = world.time + seconds;
}

export function setFlash(world, text, seconds) {
  world.flash = text;
  world.flashUntil = world.time + seconds;
}

function finishRun(world, won, reason) {
  world.status = won ? 'won' : 'crashed';
  const timeBonus = won ? Math.max(0, Math.round(1200 - world.time * SCORE.timeBonusPerSecond)) : 0;
  const fuelBonus = won ? Math.round(world.plane.fuel * 5) : 0;
  world.score += (timeBonus + fuelBonus) * world.mission.scoreMult;
  world.score = Math.round(world.score);
  world.result = {
    won,
    reason,
    score: world.score,
    time: world.time,
    rings: world.nextRing,
    fuel: Math.round(world.plane.fuel),
    damage: Math.round(world.plane.damage),
    bestCombo: world.bestCombo,
    timeBonus,
    fuelBonus,
  };
}

/** Satu langkah simulasi 1/60 detik. */
export function stepWorld(world, ctl, dt) {
  if (world.status !== 'flying') return world;
  world.time += dt;
  const p = world.plane;
  const gh = groundHeight(p.x, p.z);
  const onStrip = isOnStrip(p.x, p.z);
  stepFlight(p, ctl, dt, gh, world.wind, onStrip);

  // Kerusakan: terbang terlalu rendah di luar strip = gesekan.
  if (p.airborne && p.y - gh < 4 && !onStrip && p.speed > 25) {
    p.damage = Math.min(100, p.damage + 6 * dt);
  }
  if (p.damage >= 100 && !p.crashed) {
    p.crashed = true;
  }

  // v3 — asap kebakaran: menembus kolom asap (radius 70 m, di bawah 320 m)
  // merusak pesawat pelan + peringatan sekali saat masuk. Jalur staged
  // (cover/ring/landing/cockpit) tidak pernah masuk zona ini.
  let inSmoke = false;
  for (const f of WORLD.fireFronts) {
    if (Math.hypot(p.x - f.x, p.z - f.z) < 70 && p.y < 320) {
      inSmoke = true;
      break;
    }
  }
  if (inSmoke && !world.inSmoke) setMessage(world, 'ASAP KEBAKARAN — MENGHINDAR!', 3);
  world.inSmoke = inSmoke;
  if (inSmoke) p.damage = Math.min(100, p.damage + 2 * dt);

  // Ring berikutnya.
  if (world.mission.id !== 'hop') {
    const hit = checkRingPass(world.rings, world.nextRing, p);
    if (hit >= 0) {
      world.nextRing += 1;
      world.combo += 1;
      world.bestCombo = Math.max(world.bestCombo, world.combo);
      const gain = Math.round((SCORE.ring + world.combo * SCORE.comboStep) * world.mission.scoreMult);
      world.score += gain;
      setFlash(world, `+${gain}  RING ${hit + 1}/10 — ${world.rings[hit].name}`, 2.2);
    }
  } else {
    // Island Hop: kirim kargo dengan mendarat di tiap pemberhentian.
    // (Mendarat di tanah kasar Pulau Karang tetap dihitung: roda menyentuh
    // tanah dengan kecepatan rendah sudah cukup untuk bongkar kargo.)
    const stop = world.hopStops[world.hopIndex];
    const onGround = !p.airborne && p.y <= gh + 1.3 && p.speed < 40;
    if (stop && (p.landed || onGround)) {
      const d = Math.hypot(p.x - stop.x, p.z - stop.z);
      if (d < 260) {
        stop.done = true;
        world.hopIndex += 1;
        world.deliveries += 1;
        const gain = Math.round(SCORE.delivery * world.mission.scoreMult);
        world.score += gain;
        setFlash(world, `+${gain}  KARGO TERKIRIM — ${stop.name}`, 2.5);
        p.landed = false;
        p.airborne = false;
      }
    }
  }

  // Menang / kalah.
  if (p.crashed) {
    finishRun(world, false, p.fuel <= 0 ? 'BAHAN BAKAR HABIS — ELANG NUSA JATUH' : 'ELANG NUSA HANCUR — TABRAKAN');
  } else if (p.fuel <= 0 && !p.airborne && p.speed < 2 && !p.landed) {
    finishRun(world, false, 'BAHAN BAKAR HABIS DI DARAT');
  } else if (world.mission.id === 'hop' && world.deliveries >= 3) {
    finishRun(world, true, 'SEMUA KARGO TERKIRIM — MISI SELESAI');
  } else if (world.mission.id !== 'hop' && p.landed && world.nextRing >= 10) {
    finishRun(world, true, '10/10 RING + MENDARAT MULUS DI LAPANGAN NUSA');
  } else if (p.landed && world.nextRing < 10 && world.mission.id !== 'hop') {
    // Mendarat lebih awal: boleh lepas landas lagi, bukan kalah.
    p.landed = false;
    p.airborne = false;
    setMessage(world, 'MENDARAT — RING BELUM LENGKAP. LEPAS LANDAS LAGI (THROTTLE PENUH + W).', 4);
  }
  return world;
}

/** Target navigasi aktif: ring berikutnya / pemberhentian hop berikutnya. */
export function currentTarget(world) {
  if (world.mission.id === 'hop') {
    const stop = world.hopStops[world.hopIndex];
    return stop ? { name: stop.name, x: stop.x, y: 120, z: stop.z, kind: 'stop' } : null;
  }
  const r = world.rings ? world.rings[world.nextRing] : null;
  return r ? { name: r.name, x: r.x, y: r.y, z: r.z, kind: 'ring' } : null;
}

/** Jarak (m) + arah relatif ke target, untuk panah HUD. */
export function targetInfo(world) {
  const t = currentTarget(world);
  if (!t) return null;
  const p = world.plane;
  const dx = t.x - p.x;
  const dz = t.z - p.z;
  const dist = Math.hypot(dx, dz);
  const bearing = Math.atan2(dx, dz);
  let rel = bearing - p.heading;
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;
  return { name: t.name, dist, relBearing: rel, kind: t.kind };
}

export { knots };
