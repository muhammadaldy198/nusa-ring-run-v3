// NUSA RING RUN — fire.js (v3)
// Kebakaran hutan Nusa: tiga front api di lereng kepulauan. Api + asapnya
// TERLIHAT di frame permainan (bukan ikon HUD): bara oranye di tanah,
// lidah api yang menjilat, kolom asap gelap yang naik menembus langit.
// Semua animasi fungsi murni dari waktu dunia — deterministik, tanpa state
// yang menumpuk, jadi staged screenshot selalu memberi frame yang sama.
import { WORLD } from './config.js';
import { groundHeight } from './terrain.js';
import { createRandom } from './random.js';

const FLAME_TOP = 0xffd23f;
const FLAME_MID = 0xff8c1a;
const FLAME_DEEP = 0xff5a1a;
const SMOKE_TONE = 0x453c33;
const EMBER_TONE = 0xffc46a;

/** Satu front api: bara + lidah api + bara beterbangan + kolom asap. */
function buildFront(THREE, front, rng) {
  const group = new THREE.Group();
  const gy = groundHeight(front.x, front.z);
  const animated = { flames: [], glows: [], puffs: [], embers: null };

  // Bara di tanah: cakram oranye berdenyut di atas tanah hangus.
  for (let i = 0; i < 5; i += 1) {
    const r = 16 + rng() * 26;
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(r, 18),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? FLAME_DEEP : FLAME_MID,
        transparent: true, opacity: 0.5,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    const a = rng() * Math.PI * 2;
    const d = rng() * front.radius * 0.55;
    glow.position.set(
      front.x + Math.cos(a) * d,
      groundHeight(front.x + Math.cos(a) * d, front.z + Math.sin(a) * d) + 1.2,
      front.z + Math.sin(a) * d,
    );
    glow.userData.phase = rng() * Math.PI * 2;
    glow.userData.base = 0.42 + rng() * 0.22;
    group.add(glow);
    animated.glows.push(glow);
  }

  // Lidah api: kerucut oranye-kuning yang menjilat naik-turun.
  for (let i = 0; i < 9; i += 1) {
    const h = 16 + rng() * 20;
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(5 + rng() * 7, h, 7),
      new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? FLAME_TOP : i % 3 === 1 ? FLAME_MID : FLAME_DEEP,
        transparent: true, opacity: 0.88,
      }),
    );
    const a = rng() * Math.PI * 2;
    const d = rng() * front.radius * 0.7;
    const fx = front.x + Math.cos(a) * d;
    const fz = front.z + Math.sin(a) * d;
    flame.position.set(fx, groundHeight(fx, fz) + h / 2 - 1, fz);
    flame.userData.phase = rng() * Math.PI * 2;
    flame.userData.height = h;
    flame.userData.speed = 5 + rng() * 4;
    group.add(flame);
    animated.flames.push(flame);
  }

  // Bara beterbangan: titik-titik oranye yang naik lalu kembali ke bawah.
  const emberCount = 42;
  const emberPos = new Float32Array(emberCount * 3);
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({
      color: EMBER_TONE, size: 2.6, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  const emberSeed = [];
  for (let i = 0; i < emberCount; i += 1) {
    emberSeed.push({
      a: rng() * Math.PI * 2,
      d: rng() * front.radius * 0.8,
      phase: rng(),
      drift: 6 + rng() * 14,
    });
  }
  embers.userData.seed = emberSeed;
  embers.userData.ground = gy;
  embers.userData.cx = front.x;
  embers.userData.cz = front.z;
  group.add(embers);
  animated.embers = embers;

  // Kolom asap: gumpalan gelap berlapis yang naik sampai ~200 m lalu
  // kembali ke bawah — siklus murni dari waktu, tanpa state menumpuk.
  for (let i = 0; i < 6; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(20 + i * 4.5, 10, 8),
      new THREE.MeshLambertMaterial({
        color: SMOKE_TONE, transparent: true, opacity: 0.5,
      }),
    );
    puff.userData.baseX = front.x + (rng() - 0.5) * 46;
    puff.userData.baseZ = front.z + (rng() - 0.5) * 46;
    puff.userData.baseY = gy + 14 + i * 12;
    puff.userData.phase = rng() * Math.PI * 2;
    puff.userData.slot = i / 6;
    group.add(puff);
    animated.puffs.push(puff);
  }

  return { group, animated };
}

/**
 * Bangun semua front api (WORLD.fireFronts). Kembalikan { group, update }.
 * update(time) murni fungsi waktu: bara berdenyut, api menjilat, asap naik.
 */
export function createWildfire(THREE) {
  const group = new THREE.Group();
  const rng = createRandom(777);
  const fronts = [];
  for (const front of WORLD.fireFronts) {
    const built = buildFront(THREE, front, rng);
    group.add(built.group);
    fronts.push(built.animated);
  }

  function update(time) {
    for (const f of fronts) {
      for (const glow of f.glows) {
        glow.material.opacity = glow.userData.base
          * (0.75 + 0.25 * Math.sin(time * 2.4 + glow.userData.phase));
      }
      for (const flame of f.flames) {
        const flick = 0.82 + 0.3 * Math.sin(time * flame.userData.speed + flame.userData.phase);
        flame.scale.y = flick;
        flame.scale.x = 1 + 0.12 * Math.sin(time * 3.1 + flame.userData.phase);
        flame.rotation.y = Math.sin(time * 1.7 + flame.userData.phase) * 0.2;
      }
      const ep = f.embers.geometry.attributes.position;
      const seeds = f.embers.userData.seed;
      for (let i = 0; i < seeds.length; i += 1) {
        const s = seeds[i];
        const cyc = (time * 0.24 + s.phase) % 1;
        ep.setXYZ(
          i,
          f.embers.userData.cx + Math.cos(s.a) * s.d + cyc * s.drift,
          f.embers.userData.ground + 4 + cyc * 130,
          f.embers.userData.cz + Math.sin(s.a) * s.d + cyc * s.drift * 0.6,
        );
      }
      ep.needsUpdate = true;
      for (const puff of f.puffs) {
        // Naik 200 m dalam satu siklus, bergeser ikut angin, lalu pudar.
        const cyc = (time * 7 + puff.userData.slot * 200 + puff.userData.phase * 9) % 200;
        puff.position.set(
          puff.userData.baseX + cyc * 0.32 + Math.sin(puff.userData.phase + time * 0.3) * 12,
          puff.userData.baseY + cyc,
          puff.userData.baseZ + cyc * 0.18,
        );
        puff.material.opacity = 0.55 * (1 - cyc / 260);
        const grow = 1 + cyc / 220;
        puff.scale.setScalar(grow);
      }
    }
  }

  return { group, update };
}
