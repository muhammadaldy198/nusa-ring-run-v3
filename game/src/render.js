// NUSA RING RUN — render.js (v3)
// Scene Three.js + golden hour: matahari rendah hangat, kabut senja,
// langit satu gaya dengan terrain. v3: langit gradasi golden-hour (bukan
// satu warna oranye datar), matahari + halo, kawanan elang beneran
// (badan + sayap menyapu + ekor, bukan chevron hitam), dan kebakaran
// hutan yang terlihat di frame. Juga debu touchdown + asap Merapi yang
// bergerak mengikuti jam dunia (deterministik dalam mode shot).
import * as THREE from 'three';
import { createTerrain } from './terrain.js';
import { createAircraft, poseAircraft } from './aircraft.js';
import { addRingsToScene, paintRings } from './rings.js';
import { createWildfire } from './fire.js';
import { WORLD_SEED } from './config.js';
import { createRandom } from './random.js';

/** Gradasi langit golden-hour: zenit ungu → oranye → kuning di horizon. */
function makeSkyTexture() {
  const cv = document.createElement('canvas');
  cv.width = 4;
  cv.height = 256;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#241640');
  grad.addColorStop(0.32, '#6a3a7a');
  grad.addColorStop(0.55, '#c65a3a');
  grad.addColorStop(0.74, '#ff9a3d');
  grad.addColorStop(0.88, '#ffc46a');
  grad.addColorStop(1.0, '#ffe9b0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRenderer(canvas, mission) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(mission.fog, mission.fogNear, mission.fogFar);

  // Kubah langit gradasi — langit senja berlapis, bukan bidang datar.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(8200, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // Golden hour: matahari rendah dari barat, hangat.
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.5);
  sun.position.set(-1800, 700, 900);
  scene.add(sun);
  // Cakram matahari di barat + halo hangat — langit senja tidak kosong.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(150, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8, fog: false }),
  );
  sunDisc.position.set(-3400, 620, 1500);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  const halo1 = new THREE.Mesh(
    new THREE.CircleGeometry(260, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.28, fog: false }),
  );
  halo1.position.copy(sunDisc.position).multiplyScalar(1.001);
  halo1.lookAt(0, 0, 0);
  scene.add(halo1);
  const halo2 = new THREE.Mesh(
    new THREE.CircleGeometry(430, 24),
    new THREE.MeshBasicMaterial({ color: 0xffb36a, transparent: true, opacity: 0.12, fog: false }),
  );
  halo2.position.copy(sunDisc.position).multiplyScalar(1.002);
  halo2.lookAt(0, 0, 0);
  scene.add(halo2);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a5a3a, 0.75);
  scene.add(hemi);

  const terrain = createTerrain(THREE, WORLD_SEED);
  scene.add(terrain.group);

  // Kebakaran hutan v3: tiga front api + asap di jalur kursus.
  const wildfire = createWildfire(THREE);
  scene.add(wildfire.group);

  // Kawanan elang v3 — burung BENERAN: badan + sayap menyapu + ekor,
  // cokelat hangat (bukan chevron hitam), formasi-V 7 ekor di langit
  // atas frame cover. Posisi dari RNG tetap (deterministik).
  const birds = new THREE.Group();
  const birdRng = createRandom(4242);
  const birdMat = new THREE.MeshBasicMaterial({ color: 0x3a2a1c, fog: false });
  const birdBelly = new THREE.MeshBasicMaterial({ color: 0x8a6a4a, fog: false });
  // Jangkar formasi di sumbu pandang kamera cover v3: ~350 m di depan
  // kamera, di langit atas frame. (Kamera cover v3 ~(-170,121,565),
  // pandang ke (0.91,0,0.42) menuju ring 9 GERBANG NUSA (120,110,700);
  // jangkar v2 (405,145) sudah di luar sumbu pandang v3 — burung tak
  // terlihat di cover v3 sebelum perbaikan ini.)
  const anchorX = 150;
  const anchorZ = 713;
  const vOffsets = [
    [0, 0], [-34, 30], [-34, -30], [-68, 60], [-68, -60], [-102, 90], [-102, -90],
  ];
  for (let i = 0; i < 7; i += 1) {
    const bird = new THREE.Group();
    // Badan: memanjang searah terbang (+z lokal), cokelat hangat.
    const body = new THREE.Mesh(new THREE.SphereGeometry(1.7, 10, 8), birdMat);
    body.scale.set(0.55, 0.5, 2.1);
    bird.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1.5, 10, 8), birdBelly);
    belly.scale.set(0.45, 0.35, 1.9);
    belly.position.y = -0.35;
    bird.add(belly);
    // Sayap menyapu ke belakang: kotak pipih + putar, ujung oranye samar.
    const wingGeo = new THREE.BoxGeometry(7.2, 0.5, 2.6);
    const wl = new THREE.Mesh(wingGeo, birdMat);
    wl.position.set(-3.9, 0.2, -0.6);
    wl.rotation.y = 0.3;
    wl.rotation.z = 0.28;
    const wr = new THREE.Mesh(wingGeo, birdMat);
    wr.position.set(3.9, 0.2, -0.6);
    wr.rotation.y = -0.3;
    wr.rotation.z = -0.28;
    bird.add(wl);
    bird.add(wr);
    // Ekor kipas di belakang.
    const tail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.8), birdMat);
    tail.position.set(0, 0.1, -3.9);
    bird.add(tail);
    bird.userData.wl = wl;
    bird.userData.wr = wr;
    bird.userData.baseY = 205 + birdRng() * 22;
    bird.userData.phase = birdRng() * Math.PI * 2;
    // Formasi-V membuka ke belakang (-x): pemimpin di depan (+x, arah hanyut).
    bird.position.set(
      anchorX + vOffsets[i][0],
      bird.userData.baseY,
      anchorZ + vOffsets[i][1],
    );
    // Hadap arah hanyut (+x): sumbu badan +z diputar ke +x.
    bird.rotation.y = Math.PI / 2;
    birds.add(bird);
  }
  scene.add(birds);

  const aircraft = createAircraft(THREE);
  scene.add(aircraft.group);

  // Debu touchdown: 90 partikel, posisi dari RNG tetap.
  const dustRng = createRandom(99);
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(90 * 3);
  const dustVel = [];
  for (let i = 0; i < 90; i += 1) {
    dustVel.push({
      x: (dustRng() - 0.5) * 14,
      y: dustRng() * 5 + 1,
      z: (dustRng() - 0.5) * 14,
    });
  }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({ color: 0xd9c8a8, size: 3.2, transparent: true, opacity: 0 }),
  );
  scene.add(dust);
  let dustOrigin = null;
  let dustAge = 99;

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 9000);
  camera.position.set(0, 20, -30);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    renderer, scene, camera, terrain, aircraft, dust,
    spawnDust(x, y, z) {
      dustOrigin = new THREE.Vector3(x, y, z);
      dustAge = 0;
    },
    draw(world, rig, time) {
      const p = world.plane;
      poseAircraft(aircraft, p, 1 / 60, time);
      paintRings(world.rings, world.nextRing);
      // Ring aktif berdenyut pelan.
      const active = world.rings[world.nextRing];
      if (active) {
        const s = 1 + Math.sin(time * 3) * 0.03;
        active.mesh.scale.setScalar(s);
      }
      // Api + asap kebakaran: fungsi murni waktu — deterministik.
      wildfire.update(time);
      // Asap Merapi naik + bergeser dengan angin.
      terrain.smoke.children.forEach((puff) => {
        const cyc = (time * 6 + puff.userData.phase * 12) % 120;
        puff.position.y = puff.userData.baseY + cyc;
        puff.position.x = Math.sin(puff.userData.phase + time * 0.2) * 24;
        puff.material.opacity = 0.55 * (1 - cyc / 160);
      });
      // Awan hanyut pelan.
      terrain.clouds.children.forEach((cl, i) => {
        cl.position.x += 0.35 + (i % 3) * 0.12;
        if (cl.position.x > 1800) cl.position.x = -1800;
      });
      // Elang: hanyut pelan ke timur + naik-turun lembut + kepak sayap.
      birds.children.forEach((b) => {
        b.position.x += 0.55;
        if (b.position.x > 1800) b.position.x = -1800;
        b.position.y = b.userData.baseY + Math.sin(time * 0.7 + b.userData.phase) * 6;
        const flap = 0.28 + Math.sin(time * 5 + b.userData.phase) * 0.35;
        b.userData.wl.rotation.z = flap;
        b.userData.wr.rotation.z = -flap;
      });
      // Debu: mekar 1,6 detik lalu hilang.
      if (dustOrigin && dustAge < 1.6) {
        dustAge += 1 / 60;
        const posAttr = dust.geometry.attributes.position;
        for (let i = 0; i < 90; i += 1) {
          const v = dustVel[i];
          posAttr.setXYZ(
            i,
            dustOrigin.x + v.x * dustAge,
            dustOrigin.y + v.y * dustAge - dustAge * dustAge * 2,
            dustOrigin.z + v.z * dustAge,
          );
        }
        posAttr.needsUpdate = true;
        dust.material.opacity = Math.max(0, 0.85 * (1 - dustAge / 1.6));
      } else {
        dust.material.opacity = 0;
      }
      rig.camera = camera;
      renderer.render(scene, camera);
    },
  };
}

/** Pasang ring kursus ke scene (dipanggil sekali setelah world dibuat). */
export function attachRingsToScene(renderCtx, rings) {
  addRingsToScene(renderCtx.scene, rings);
}
