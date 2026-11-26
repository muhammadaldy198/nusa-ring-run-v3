// NUSA RING RUN — main.js
// Boot + satu loop + state machine (title → flying → won/crashed).
// ?seed=N menetapkan dunia. ?shot=cover|cockpit|ring|landing (+ &seed=N)
// men-stage scene itu, menggambarnya 2x, lalu set window.__shotReady untuk
// screenshot — pola starter kit.
import * as THREE from 'three';
import { createWorld, attachRings, resetWorld, startFlight, stepWorld, STEP } from './world.js';
import { createRenderer, attachRingsToScene } from './render.js';
import { createCameraRig, setCameraMode, updateCamera } from './camera.js';
import { createHud, updateHud, renderTitleMissions } from './hud.js';
import {
  createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_CAMERA, ACTION_MAP,
  ACTION_FLAPS, ACTION_GEAR, ACTION_MISSION_RING, ACTION_MISSION_HOP,
  ACTION_MISSION_STORM,
} from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { WORLD_SEED } from './config.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : WORLD_SEED;
const missionParam = params.get('mission') || 'ring';

const canvas = document.getElementById('game');
const container = document.getElementById('app');
const status = document.getElementById('status');

let missionId = ['ring', 'hop', 'storm'].includes(missionParam) ? missionParam : 'ring';
let world = createWorld(missionId, seed);
let rings = attachRings(world, THREE);
const renderCtx = createRenderer(canvas, world.mission);
attachRingsToScene(renderCtx, rings);
resetWorld(world);

const rig = createCameraRig(renderCtx.camera);
const hud = createHud(container);
const input = createInput(canvas);
const audio = createAudio();
renderTitleMissions(hud, missionId);
// Kamera langsung menempel di belakang pesawat (bukan terbang menyeberang
// peta dari titik awal) — frame pertama sudah menunjukkan Elang Nusa.
for (let i = 0; i < 3; i += 1) updateCamera(rig, world.plane, 5);

let cameraMode = 'chase';
let showMap = false;
let paused = false;
let prevLanded = false;
let prevCrashed = false;

function applyMissionFog() {
  renderCtx.scene.fog.color.setHex(world.mission.fog);
  renderCtx.scene.fog.near = world.mission.fogNear;
  renderCtx.scene.fog.far = world.mission.fogFar;
}

function switchMission(id) {
  if (id === missionId && world.status === 'title') return;
  missionId = id;
  for (const r of rings) renderCtx.scene.remove(r.mesh);
  world = createWorld(missionId, seed);
  rings = attachRings(world, THREE);
  attachRingsToScene(renderCtx, rings);
  resetWorld(world);
  applyMissionFog();
  renderTitleMissions(hud, missionId);
  prevLanded = false;
  prevCrashed = false;
}

function setMode(mode) {
  cameraMode = mode;
  setCameraMode(rig, mode);
}

function announce(message) {
  status.textContent = message;
}

function drawFrame(time, camDt) {
  updateCamera(rig, world.plane, camDt);
  renderCtx.draw(world, rig, time);
  updateHud(hud, world, cameraMode, showMap);
}

function runShot(name) {
  const mode = stageShot(name, {
    world, renderCtx, rig,
    setCameraMode: (m) => setMode(m),
  });
  cameraMode = mode;
  let painted = 0;
  function paint() {
    drawFrame(world.time, 1 / 60);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  function startSelected() {
    audio.ensure();
    resetWorld(world);
    startFlight(world);
    paused = false;
    prevLanded = false;
    prevCrashed = false;
    for (let i = 0; i < 3; i += 1) updateCamera(rig, world.plane, 5);
    announce(`Terbang. Misi ${world.mission.name}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MISSION_RING) switchMission('ring');
    if (actions & ACTION_MISSION_HOP) switchMission('hop');
    if (actions & ACTION_MISSION_STORM) switchMission('storm');
    if (actions & ACTION_CAMERA) {
      setMode(cameraMode === 'chase' ? 'cockpit' : 'chase');
    }
    if (actions & ACTION_MAP) showMap = !showMap;
    if (actions & ACTION_FLAPS && world.status === 'flying') {
      world.plane.flaps = !world.plane.flaps;
    }
    if (actions & ACTION_GEAR && world.status === 'flying') {
      world.plane.gear = !world.plane.gear;
    }
    if (actions & ACTION_PAUSE && world.status === 'flying') {
      paused = !paused;
      announce(paused ? 'Jeda.' : 'Terbang.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.ensure();
      if (world.status === 'title') startSelected();
      else if (world.status === 'won' || world.status === 'crashed') {
        resetWorld(world);
        world.status = 'title';
        renderTitleMissions(hud, missionId);
        announce('Nusa Ring Run. Pilih misi, tekan Enter.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    handleActions();
    const drag = input.takeDrag();
    if (drag.x || drag.y) {
      rig.dragYaw += drag.x;
      rig.dragPitch -= drag.y;
    }
    if (world.status === 'flying' && !paused) {
      accumulator += dt;
      const ctl = input.control();
      world.plane.brake = ctl.brake;
      while (accumulator >= STEP) {
        stepWorld(world, ctl, STEP);
        accumulator -= STEP;
      }
      const p = world.plane;
      if (p.landed && !prevLanded) renderCtx.spawnDust(p.x, p.y, p.z);
      if (p.crashed && !prevCrashed) {
        renderCtx.spawnDust(p.x, p.y, p.z);
        audio.crash();
      }
      prevLanded = p.landed;
      prevCrashed = p.crashed;
      audio.update(p.throttle, p.speed * 1.94, p.airborne);
    }
    drawFrame(world.time, dt);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.status === 'flying') paused = true;
  });

  announce('Nusa Ring Run. Pilih misi, tekan Enter untuk terbang.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
