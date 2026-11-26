// NUSA RING RUN — camera.js
// Kamera yang TIDAK MELAWAN pilot: chase lazy-follow (posisi mengejar
// pelan, tatapan mengejar sedikit lebih cepat — drift sinematik ala
// birdybird) + cockpit dari hidung pesawat. Mouse drag menggeser sudut
// pandang sementara, lalu kembali sendiri.
import * as THREE from 'three';

export function createCameraRig(camera) {
  return {
    camera,
    mode: 'chase',
    pos: new THREE.Vector3(0, 20, -30),
    look: new THREE.Vector3(0, 10, 0),
    dragYaw: 0,
    dragPitch: 0,
  };
}

export function setCameraMode(rig, mode) {
  rig.mode = mode;
  if (mode === 'cockpit') {
    rig.dragYaw = 0;
    rig.dragPitch = 0;
  }
}

export function updateCamera(rig, p, dt) {
  const cam = rig.camera;
  const fwd = new THREE.Vector3(
    Math.sin(p.heading) * Math.cos(p.pitch),
    Math.sin(p.pitch),
    Math.cos(p.heading) * Math.cos(p.pitch),
  );
  const up = new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(fwd, up).normalize();
  const planePos = new THREE.Vector3(p.x, p.y, p.z);

  // Drag mouse meluruh kembali ke nol.
  rig.dragYaw *= Math.max(0, 1 - dt * 1.4);
  rig.dragPitch *= Math.max(0, 1 - dt * 1.4);

  if (rig.mode === 'cockpit') {
    // Tepat di atas hidung: badan pesawat hanya strip tipis di bawah frame.
    const eye = planePos.clone().addScaledVector(fwd, 2.6).addScaledVector(up, 1.5);
    const look = planePos.clone().addScaledVector(fwd, 60).addScaledVector(up, 0.5);
    // Sedikit goyang mesin.
    eye.y += Math.sin(performance.now() * 0.05) * 0.012 * p.throttle;
    cam.position.copy(eye);
    cam.up.set(0, 1, 0);
    cam.lookAt(look);
    rig.pos.copy(eye);
    rig.look.copy(look);
    return;
  }

  // Chase: di belakang-atas pesawat, dengan offset drag.
  const back = 15 + p.speed * 0.045;
  const height = 4.6 + p.speed * 0.012;
  const desired = planePos.clone()
    .addScaledVector(fwd, -back)
    .addScaledVector(up, height)
    .addScaledVector(right, rig.dragYaw * 9);
  desired.y += rig.dragPitch * 4;
  const lookTarget = planePos.clone().addScaledVector(fwd, 26);
  lookTarget.y += 1.5 + rig.dragPitch * 6;

  // Lazy follow: posisi 2.5/detik, tatapan 3.0/detik.
  const kp = 1 - Math.exp(-2.5 * dt);
  const kl = 1 - Math.exp(-3.0 * dt);
  rig.pos.lerp(desired, kp);
  rig.look.lerp(lookTarget, kl);
  cam.position.copy(rig.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(rig.look);
}
