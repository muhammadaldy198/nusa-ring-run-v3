// NUSA RING RUN — flight.js
// Model terbang arcade "Elang Nusa": lift tumbuh dengan kecepatan, stall saat
// lambat + hidung naik, drag dari flaps/gear, ground effect ringan. Terasa
// benar tanpa simulasi 6-DOF penuh: throttle dan disiplin belok yang dinilai.
import { PLANE } from './config.js';

export function createPlaneState() {
  return {
    x: 0, y: 3, z: 0,
    heading: 0, pitch: 0, roll: 0,
    speed: 0, throttle: 0,
    flaps: false, gear: true, brake: false,
    fuel: PLANE.startFuel, damage: 0,
    verticalSpeed: 0, airborne: false, crashed: false, landed: false,
  };
}

/** Maju satu langkah dt (detik). `ctl` = {pitch, roll, yaw, throttleDelta}. */
export function stepFlight(p, ctl, dt, groundHeight, wind, onRunway) {
  if (p.crashed || p.landed) return p;
  const wx = wind ? wind.x : 0;
  const wz = wind ? wind.z : 0;

  p.throttle = Math.max(0, Math.min(1, p.throttle + ctl.throttleDelta * dt));
  if (p.fuel <= 0) p.throttle = 0;

  // --- kecepatan: thrust lawan drag (flaps + gear menambah drag) ---
  const drag = PLANE.dragBase + (p.flaps ? PLANE.dragFlaps : 0) + (p.gear ? PLANE.dragGear : 0);
  const thrust = p.throttle * PLANE.maxThrustAccel;
  const dragForce = drag * p.speed * p.speed * 0.12 + 0.6;
  let accel = thrust - dragForce - Math.sin(p.pitch) * 9.8 * 0.55;
  if (p.brake && !p.airborne) accel -= 22;
  p.speed = Math.max(0, Math.min(PLANE.maxSpeed, p.speed + accel * dt));

  // --- sikap: roll membelokkan heading, yaw membantu ---
  const targetRoll = ctl.roll * 0.9;
  p.roll += (targetRoll - p.roll) * Math.min(1, PLANE.rollRate * dt * 2.2);
  const turnAuthority = Math.min(1, p.speed / 40);
  p.heading += (-p.roll * PLANE.turnRate * turnAuthority + ctl.yaw * PLANE.yawRate) * dt;
  const targetPitch = ctl.pitch * 0.5;
  p.pitch += (targetPitch - p.pitch) * Math.min(1, PLANE.pitchRate * dt * 2.4);

  // --- stall: lambat + hidung naik = hidung jatuh, sink bertambah ---
  // Lift sebanding kecepatan: di bawah stall, lift hilang dan pesawat
  // tenggelam — tidak ada melayang di 3 m/s.
  const liftFactor = Math.min(1, p.speed / PLANE.stallSpeed);
  const stalled = p.airborne && p.speed < PLANE.stallSpeed && p.pitch > 0.05;
  let climbRate = Math.sin(p.pitch) * p.speed * PLANE.climbLift * liftFactor;
  if (stalled) climbRate -= (PLANE.stallSpeed - p.speed) * 0.9;
  else if (p.airborne && p.speed < PLANE.stallSpeed) climbRate -= (PLANE.stallSpeed - p.speed) * 0.35;
  // Ground effect: dekat tanah, lift sedikit lebih baik.
  const heightAboveGround = p.y - groundHeight;
  if (p.airborne && heightAboveGround < 12) climbRate += (12 - heightAboveGround) * 0.06;
  p.verticalSpeed = climbRate;

  const fx = Math.sin(p.heading) * Math.cos(p.pitch);
  const fz = Math.cos(p.heading) * Math.cos(p.pitch);
  p.x += (fx * p.speed + wx) * dt;
  p.z += (fz * p.speed + wz) * dt;
  p.y += climbRate * dt;

  // --- lepas landas: cukup cepat + tarik = terbang ---
  // (JANGAN matikan airborne di sini: blok tanah di bawah yang memutuskan
  // mendarat / tabrakan / sentuhan kasar.)
  if (!p.airborne && p.speed > 30 && p.pitch > 0.06) p.airborne = true;

  // --- bahan bakar: boros sebanding throttle ---
  p.fuel = Math.max(0, p.fuel - (PLANE.fuelBurnBase + p.throttle * PLANE.fuelBurnThrottle) * dt);

  // --- tanah: mendarat mulus atau tabrakan ---
  if (p.y <= groundHeight + 1.2) {
    p.y = groundHeight + 1.2;
    if (p.airborne) {
      const sink = -p.verticalSpeed;
      const rollDeg = Math.abs(p.roll) * 57.2958;
      const pitchDeg = Math.abs(p.pitch) * 57.2958;
      const onStrip = Boolean(onRunway);
      if (onStrip && p.speed <= 58 && sink <= 4.5 && rollDeg <= 12 && pitchDeg <= 9) {
        p.landed = true;
        p.airborne = false;
        p.speed = Math.max(0, p.speed - 18 * dt);
      } else if (sink > 7 || p.speed > 62 || rollDeg > 25) {
        p.crashed = true;
        p.damage = 100;
      } else {
        // Sentuhan kasar di luar runway: rusak, tapi masih bisa bangkit.
        p.damage = Math.min(100, p.damage + 18);
        p.airborne = false;
        p.speed = Math.max(0, p.speed - 26 * dt);
      }
    } else if (p.speed > 2) {
      p.speed = Math.max(0, p.speed - (p.brake ? 26 : 6) * dt);
    }
  }
  if (p.damage >= 100) p.crashed = true;
  return p;
}

/** Kecepatan dalam knot untuk HUD. */
export function knots(speedMs) {
  return speedMs * 1.94384;
}

/** Ketinggian dalam kaki untuk HUD. */
export function feet(meters) {
  return meters * 3.28084;
}
