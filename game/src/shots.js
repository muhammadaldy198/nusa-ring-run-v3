// NUSA RING RUN — shots.js (v3)
// Scene screenshot staged (?shot=cover|cockpit|ring|landing + &seed=N).
// Tiap scene memainkan aturan asli ke depan dari dunia segar dengan
// autopilot sederhana (kejar ring berikutnya, jaga kecepatan), jadi frame
// adalah apa yang sungguh terjadi di game — dan seed yang sama selalu
// memberi frame yang sama. Pola starter kit.
// v3 — cover dirombak: final leg PENDEKATAN AKHIR → GERBANG NUSA, ring
// terakhir di depan dengan landasan Lapangan Nusa menembus di belakangnya
// (komposisi runway-menembus-ring ala Kittiwake) + asap kebakaran Nusa
// Timur di kanan frame. Bukan lagi ring melayang di langit kosong.
import { STEP, startFlight, resetWorld, stepWorld } from './world.js';
import { WORLD } from './config.js';
import { updateCamera } from './camera.js';

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Autopilot: kejar target (x, y, z) dengan kecepatan target. Mengembalikan
 * kontrol yang sama bentuknya dengan input keyboard.
 */
export function autopilot(world, tx, ty, tz, targetSpeed) {
  const p = world.plane;
  const dx = tx - p.x;
  const dz = tz - p.z;
  const desiredHeading = Math.atan2(dx, dz);
  const err = wrapAngle(desiredHeading - p.heading);
  const roll = clamp(-err * 1.6, -1, 1);
  const altErr = ty - p.y;
  const pitch = clamp(altErr * 0.03, -0.6, 0.7);
  const throttleDelta = p.speed < targetSpeed ? 0.9 : -0.6;
  return { pitch, roll, yaw: 0, throttleDelta, brake: false };
}

function ringTarget(world) {
  const r = world.rings[world.nextRing];
  return r ? [r.x, r.y, r.z] : [WORLD.runway.x, 120, WORLD.runway.z];
}

function settleCamera(rig, world) {
  for (let i = 0; i < 4; i += 1) updateCamera(rig, world.plane, 1);
}

/** Jalankan simulasi sampai `done(world)` benar atau `maxSteps` habis. */
function simulate(world, renderCtx, stepFn, maxSteps) {
  let prevLanded = false;
  let prevCrashed = false;
  for (let i = 0; i < maxSteps; i += 1) {
    const ctl = stepFn(world);
    stepWorld(world, ctl, STEP);
    const p = world.plane;
    if (p.landed && !prevLanded) {
      renderCtx.spawnDust(p.x, p.y, p.z);
      prevLanded = true;
    }
    if (p.crashed && !prevCrashed) {
      renderCtx.spawnDust(p.x, p.y, p.z);
      prevCrashed = true;
    }
    if (world._done && world._done(world)) return true;
  }
  return false;
}

/**
 * Stage scene bernama ke `game` ({world, renderCtx, rig, setCameraMode}).
 * Mengembalikan mode kamera yang dipakai scene itu.
 */
export function stageShot(name, game) {
  const { world, renderCtx, rig } = game;
  resetWorld(world);

  if (name === 'landing') {
    // Final sungguhan setelah kursus selesai: semua ring dianggap lewat,
    // skor sudah terkumpul, lalu pesawat diterbangkan ke runway beneran.
    for (const r of world.rings) r.passed = true;
    world.nextRing = 10;
    world.score = 3250;
    world.combo = 4;
    world.bestCombo = 4;
    startFlight(world);
    const p = world.plane;
    // Final panjang di sumbu runway: target selalu 500 m di depan tengah
    // runway, jadi pesawat tidak pernah berbalik arah di ujung final.
    p.x = WORLD.runway.x - 950;
    p.y = 80;
    p.z = WORLD.runway.z;
    p.heading = Math.PI / 2;
    p.pitch = -0.04;
    p.roll = 0;
    p.speed = 50;
    p.throttle = 0.4;
    p.flaps = true;
    p.gear = true;
    p.airborne = true;
    world._done = (w) => w.plane.landed || w.plane.crashed || w.time > 40;
    simulate(world, renderCtx, (w) => {
      const pp = w.plane;
      // Glide ke titik touchdown (x = -100, tengah-barat runway): 80 m di
      // x=-950 turun ke 7 m di x=-100, lalu flare mendatar.
      const targetAlt = 7 + Math.max(0, (WORLD.runway.x - 100) - pp.x) * 0.086;
      const ctl = autopilot(w, WORLD.runway.x + 500, targetAlt, WORLD.runway.z, 34);
      // Final lurus: batasi roll + pitch supaya tidak oleng.
      ctl.roll = clamp(ctl.roll, -0.45, 0.45);
      ctl.pitch = clamp(ctl.pitch, -0.35, 0.35);
      // Di atas runway: kurangi throttle (final idle, bukan gas penuh).
      if (pp.x > WORLD.runway.x - 150) ctl.throttleDelta = -0.8;
      return ctl;
    }, 40 * 60);
    game.setCameraMode('chase');
    settleCamera(rig, world);
    return 'chase';
  }

  // Berhenti saat MENDEKATI ring berikutnya (bukan tepat setelah lewat):
  // ring oranye besar di depan, pesawat di tengah, terrain di bawah.
  function approaching(world, ringIndex, maxDist) {
    if (world.nextRing < ringIndex) return false;
    const r = world.rings[ringIndex];
    if (!r) return false;
    const p = world.plane;
    return Math.hypot(p.x - r.x, p.y - r.y, p.z - r.z) < maxDist;
  }

  // cover / cockpit / ring: terbang kursus dari lepas landas.
  startFlight(world);
  if (name === 'cockpit') {
    world._done = (w) => approaching(w, 2, 320);
    simulate(world, renderCtx, (w) => {
      const [tx, ty, tz] = ringTarget(w);
      return autopilot(w, tx, ty, tz, 56);
    }, 150 * 60);
    game.setCameraMode('cockpit');
    settleCamera(rig, world);
    return 'cockpit';
  }
  if (name === 'ring') {
    world._done = (w) => approaching(w, 5, 260);
    simulate(world, renderCtx, (w) => {
      const [tx, ty, tz] = ringTarget(w);
      return autopilot(w, tx, ty, tz, 58);
    }, 200 * 60);
    game.setCameraMode('chase');
    settleCamera(rig, world);
    return 'chase';
  }
  // cover (default) v3: terbang SELURUH kursus sampai mendekati ring
  // ke-10 GERBANG NUSA (300 m) — final leg dari PENDEKATAN AKHIR.
  // Ring oranye BESAR di tengah, landasan Nusa membentang di belakangnya,
  // asap kebakaran Nusa Timur naik di kanan frame, checklist 9 ✓.
  // Berhenti di 300 m (bukan 200 m): dari 200 m landasan masih di bawah
  // frame/strip HUD; dari 300 m landasan + menara + hangar masuk frame
  // di bawah ring, ring tetap besar (~105 px).
  // Bahan bakar cukup: ~220 dtk x 0,22/dtk ≈ 48 dari 100.
  world._done = (w) => approaching(w, 9, 300);
  simulate(world, renderCtx, (w) => {
    const [tx, ty, tz] = ringTarget(w);
    return autopilot(w, tx, ty, tz, 56);
  }, 420 * 60);
  game.setCameraMode('chase');
  settleCamera(rig, world);
  return 'chase';
}
