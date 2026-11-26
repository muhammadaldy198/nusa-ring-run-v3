// NUSA RING RUN — audio.js
// Suara disintesis Web Audio API — tanpa file suara, tanpa network.
// Mesin = osilator gergaji (nada naik dengan throttle), angin = noise
// putih yang difilter (kencang dengan kecepatan), ding saat lewati ring.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windSrc = null;
  let windGain = null;
  let windFilter = null;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();

      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
      windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 700;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      windSrc.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  return {
    ensure,
    /** Dipanggil tiap frame saat terbang. */
    update(throttle, speed, airborne) {
      if (!started || !ctx) return;
      try {
        if (ctx.state === 'suspended') void ctx.resume();
        const t = ctx.currentTime;
        engineOsc.frequency.setTargetAtTime(52 + throttle * 130 + speed * 0.35, t, 0.08);
        engineGain.gain.setTargetAtTime(airborne || throttle > 0.05 ? 0.045 + throttle * 0.05 : 0, t, 0.1);
        windGain.gain.setTargetAtTime(Math.min(0.09, speed * 0.0009), t, 0.15);
        windFilter.frequency.setTargetAtTime(500 + speed * 9, t, 0.15);
      } catch {
        // Audio tidak boleh mematikan game.
      }
    },
    ring() {
      if (!started || !ctx) return;
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = 880;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.55);
      } catch {
        // Diam saja bila gagal.
      }
    },
    crash() {
      if (!started || !ctx) return;
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(160, ctx.currentTime);
        o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.6);
        g.gain.setValueAtTime(0.16, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + 0.75);
      } catch {
        // Diam saja bila gagal.
      }
    },
  };
}
