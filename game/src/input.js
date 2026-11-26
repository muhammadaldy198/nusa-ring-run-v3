// NUSA RING RUN — input.js
// Keyboard + mouse. Skema standar flight sim: W/S pitch, A/D roll, Q/E yaw,
// Shift/Ctrl throttle, F flaps, G gear, B rem, C kamera, M peta, P jeda.
// Aksi sekali-tekan dikumpulkan dan diambil lewat takeActions().
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_CAMERA = 4;
export const ACTION_MAP = 8;
export const ACTION_FLAPS = 16;
export const ACTION_GEAR = 32;
export const ACTION_MISSION_RING = 64;
export const ACTION_MISSION_HOP = 128;
export const ACTION_MISSION_STORM = 256;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let dragX = 0;
  let dragY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function keyDown(e) {
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyC') actions |= ACTION_CAMERA;
    if (e.code === 'KeyM') actions |= ACTION_MAP;
    if (e.code === 'KeyF') actions |= ACTION_FLAPS;
    if (e.code === 'KeyG') actions |= ACTION_GEAR;
    if (e.code === 'Digit1') actions |= ACTION_MISSION_RING;
    if (e.code === 'Digit2') actions |= ACTION_MISSION_HOP;
    if (e.code === 'Digit3') actions |= ACTION_MISSION_STORM;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  }
  function keyUp(e) {
    keys.delete(e.code);
  }
  function mouseDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function mouseMove(e) {
    if (!dragging) return;
    dragX += (e.clientX - lastX) * 0.004;
    dragY += (e.clientY - lastY) * 0.004;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function mouseUp() {
    dragging = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mousemove', mouseMove);
  window.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('click', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    /** Kontrol analog tiap frame: pitch/roll/yaw -1..1, throttleDelta/detik. */
    control() {
      const pitch = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0)
        - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const roll = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
      const yaw = (keys.has('KeyQ') ? 1 : 0) - (keys.has('KeyE') ? 1 : 0);
      let throttleDelta = 0;
      if (keys.has('ShiftLeft') || keys.has('ShiftRight')) throttleDelta += 0.55;
      if (keys.has('ControlLeft') || keys.has('ControlRight')) throttleDelta -= 0.7;
      return {
        pitch, roll, yaw, throttleDelta,
        brake: keys.has('KeyB'),
      };
    },
    takeActions() {
      const a = actions;
      actions = 0;
      return a;
    },
    /** Offset kamera dari drag mouse; dikonsumsi tiap frame. */
    takeDrag() {
      const d = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return d;
    },
  };
}
