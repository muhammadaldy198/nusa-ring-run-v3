# NUSA RING RUN — Elang Nusa

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/muhammadaldy198/nusa-ring-run-v3/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/muhammadaldy198/nusa-ring-run-v3/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

Terbangkan **Elang Nusa** di atas kepulauan vulkanik Indonesia fiktif — Gunung Merapi berasap, sawah terasering, desa nelayan Teluk Nelayan, mercusuar Tanjung, Danau Nusa — lewat **10 ring bernama** lalu mendarat di **Lapangan Terbang Nusa**. Tiga front **kebakaran hutan** membara di jalur kursus: bara oranye, lidah api, dan kolom asap gelap yang naik menembus langit senja — terbang menembus asap merusak pesawat, jadi putuskan: memutar atau menembus. Chase view 3D (Three.js) + cockpit view dengan panel instrumen menyala, HUD lengkap (ALT/SPD/HDG, throttle, fuel, damage, horizon, ring berikutnya), bahan bakar dan kerusakan yang memaksa keputusan, dan strip rumput darurat di Pulau Rumput bila bahan bakar menipis.

## Misi (pilih di layar judul, tombol 1/2/3)

1. **RING RUN** — 10 ring bernama + mendarat mulus, skor waktu.
2. **ISLAND HOP** — antar kargo ke Pulau Rumput dan Pulau Karang, kembali ke Nusa.
3. **STORM RESCUE** — 10 ring dalam badai: jarak pandang 700 m, angin kencang, skor x1,5.

## Kontrol

W/S pitch · A/D roll · Q/E yaw · Shift/Ctrl throttle · F flaps · G gear · B rem · C kamera (chase ↔ cockpit) · M peta · P jeda · mouse drag untuk melihat.

## Main

Buka `game/index.html` lewat server statis apa pun (mis. `node serve.ts` lalu http://localhost:8080). Tanpa network, tanpa build step. Screenshot staged: `?shot=cover|cockpit|ring|landing&seed=7` (lihat `shots.json`).

## Struktur source

- `game/src/flight.js` — model terbang arcade (lift/stall/drag/flaps/gear)
- `game/src/terrain.js` — kepulauan prosedural dari seed tetap
- `game/src/fire.js` — kebakaran hutan: bara, lidah api, bara beterbangan, kolom asap
- `game/src/aircraft.js` — pesawat "Elang Nusa" dari primitif Three.js
- `game/src/rings.js` — kursus 10 ring bernama
- `game/src/hud.js` — HUD: ALT/SPD/HDG + horizon + fuel + damage
- `game/src/cockpit.js` — enam instrumen kokpit yang menyala
- `game/src/camera.js` — chase lazy-follow + cockpit
- `game/src/input.js` — keyboard + mouse
- `game/src/audio.js` — mesin + angin disintesis Web Audio
- `game/src/render.js` — scene Three.js + golden hour
- `game/src/world.js` — state + skor + fuel + damage + menang/kalah
- `game/src/shots.js` — staged screenshot (autopilot deterministik)
- `game/src/config.js` — semua angka yang bisa disetel
- `game/src/random.js` — RNG seed tetap
- `game/src/main.js` — loop + state machine
- `game/vendor/three.module.min.js` — Three.js r160 (vendored)

## Lisensi

MIT — lihat `LICENSE`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3p0axm2p&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
