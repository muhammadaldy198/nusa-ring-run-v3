// NUSA RING RUN — aircraft.js
// "Elang Nusa": pesawat prop bermesin satu yang DIBANGUN dari primitif
// Three.js — badan, sayap, ekor, kanopi, baling-baling berputar, roda yang
// turun/naik dengan gear. Corak oranye-putih supaya terbaca di langit senja.
export function createAircraft(THREE) {
  const group = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xf2ede2, shininess: 60 });
  const orange = new THREE.MeshPhongMaterial({ color: 0xe86a1e, shininess: 60 });
  const dark = new THREE.MeshPhongMaterial({ color: 0x2a2f38, shininess: 40 });
  const glass = new THREE.MeshPhongMaterial({
    color: 0x1a3a5a, shininess: 160, specular: 0xaaccdd,
  });

  // Badan: silinder + hidung kerucut + ekor meruncing.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.62, 5.4, 12), white);
  body.rotation.x = Math.PI / 2;
  group.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 12), orange);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 3.4;
  group.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.8, 12), white);
  tail.rotation.x = -Math.PI / 2;
  tail.position.z = -3.5;
  group.add(tail);

  // Garis oranye di badan.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 5.2), orange);
  stripe.position.set(0.86, 0.1, 0);
  group.add(stripe);
  const stripeL = stripe.clone();
  stripeL.position.x = -0.86;
  group.add(stripeL);

  // Sayap utama + ujung oranye.
  const wing = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.22, 1.9), white);
  wing.position.set(0, -0.1, 0.4);
  group.add(wing);
  for (const s of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.24, 1.9), orange);
    tip.position.set(s * 5.25, -0.1, 0.4);
    group.add(tip);
  }
  // Ekor horizontal + sirip vertikal merah.
  const hstab = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.2), white);
  hstab.position.set(0, 0.15, -3.9);
  group.add(hstab);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 1.5), orange);
  fin.position.set(0, 0.95, -3.9);
  group.add(fin);

  // Kanopi.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 10), glass);
  canopy.scale.set(0.85, 0.75, 1.7);
  canopy.position.set(0, 0.62, 1.15);
  group.add(canopy);

  // Baling-baling: spinner + 2 bilah, berputar sebanding throttle.
  const prop = new THREE.Group();
  const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.8, 10), dark);
  spinner.rotation.x = Math.PI / 2;
  spinner.position.z = 0.5;
  prop.add(spinner);
  for (const a of [0, Math.PI]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.4, 0.08), dark);
    blade.rotation.z = a;
    blade.position.z = 0.35;
    prop.add(blade);
  }
  prop.position.z = 4.1;
  group.add(prop);

  // Roda: terlihat saat gear turun, tersembunyi saat naik.
  const gearGroup = new THREE.Group();
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 6), dark);
    leg.position.set(s * 1.1, -0.9, 0.9);
    gearGroup.add(leg);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 1.1, -1.45, 0.9);
    gearGroup.add(wheel);
  }
  const tailWheel = new THREE.Mesh(wheelGeo, dark);
  tailWheel.rotation.z = Math.PI / 2;
  tailWheel.scale.setScalar(0.6);
  tailWheel.position.set(0, -0.9, -3.4);
  gearGroup.add(tailWheel);
  group.add(gearGroup);

  // Lampu navigasi: merah kiri, hijau kanan.
  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xff2222 }),
  );
  navL.position.set(-5.8, -0.1, 0.4);
  group.add(navL);
  const navR = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x22ff66 }),
  );
  navR.position.set(5.8, -0.1, 0.4);
  group.add(navR);

  return { group, prop, gearGroup };
}

/** Terapkan state terbang ke mesh pesawat (posisi + sikap + baling + roda). */
export function poseAircraft(ac, p, dt, time) {
  ac.group.position.set(p.x, p.y, p.z);
  // Three.js: heading 0 = +Z, pitch +, roll +. Urutan YXZ supaya roll
  // tidak memutar heading.
  ac.group.rotation.order = 'YXZ';
  ac.group.rotation.y = p.heading;
  ac.group.rotation.x = -p.pitch;
  ac.group.rotation.z = p.roll;
  ac.prop.rotation.z += dt * (4 + p.throttle * 46);
  ac.gearGroup.visible = p.gear;
  // Goyang halus saat mesin hidup.
  const vib = p.throttle * 0.02 * Math.sin(time * 47);
  ac.group.position.y += vib;
}
