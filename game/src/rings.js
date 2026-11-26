// NUSA RING RUN — rings.js
// Kursus 10 ring BERNAMA berurutan (RING_NAMES di config.js). Ring aktif
// menyala oranye, yang sudah dilewati hijau, yang akan datang abu-abu.
// Melewati ring = skor + kombo; melewatkannya bukan kalah — tapi skor hilang.
import { RING_NAMES, RING_POINTS } from './config.js';

export function createRingCourse(THREE, mission) {
  const radius = mission.ringRadius;
  const rings = RING_POINTS.map((pt, i) => {
    const group = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 1.6, 10, 40),
      new THREE.MeshBasicMaterial({ color: 0x8899aa, transparent: true, opacity: 0.85 }),
    );
    group.add(torus);
    group.position.set(pt[0], pt[1], pt[2]);
    return {
      index: i,
      name: RING_NAMES[i],
      x: pt[0], y: pt[1], z: pt[2],
      radius,
      passed: false,
      mesh: group,
      torus,
    };
  });
  return rings;
}

export function addRingsToScene(scene, rings) {
  for (const r of rings) scene.add(r.mesh);
}

/** Warna ring: aktif = oranye menyala, dilewati = hijau, sisanya abu-abu. */
export function paintRings(rings, nextIndex) {
  rings.forEach((r, i) => {
    if (r.passed) r.torus.material.color.setHex(0x2ecc40);
    else if (i === nextIndex) r.torus.material.color.setHex(0xff8c1a);
    else r.torus.material.color.setHex(0x8899aa);
    r.torus.material.opacity = i === nextIndex ? 1 : 0.7;
  });
}

/**
 * Cek apakah pesawat melewati ring `nextIndex`. Kembali true tepat sekali
 * saat pesawat masuk ke dalam cakram ring.
 */
export function checkRingPass(rings, nextIndex, p) {
  if (nextIndex >= rings.length) return -1;
  const r = rings[nextIndex];
  const dx = p.x - r.x;
  const dy = p.y - r.y;
  const dz = p.z - r.z;
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  if (dist < r.radius * 0.85) {
    r.passed = true;
    return nextIndex;
  }
  return -1;
}

/** Ring berikutnya yang belum dilewati, atau null bila kursus selesai. */
export function nextRing(rings, nextIndex) {
  return nextIndex < rings.length ? rings[nextIndex] : null;
}
