// NUSA RING RUN — random.js
// RNG deterministik (mulberry32) + value-noise 2D dari seed tetap. Dunia,
// awan, dan penempatan pohon memakai ini — tidak pernah Math.random() di
// jalur yang memengaruhi frame, supaya screenshot staged selalu sama.
export function createRandom(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) % 10000) / 10000;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

/** Value noise 2D halus, nilai 0..1, deterministik dari (x, z, seed). */
export function valueNoise2(x, z, seed) {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const a = hash2(ix, iz, seed);
  const b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed);
  const d = hash2(ix + 1, iz + 1, seed);
  const ux = smooth(fx);
  const uz = smooth(fz);
  return (a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz);
}

/** Noise berlapis (fbm) 3 oktaf untuk bukit. */
export function fbm2(x, z, seed) {
  return (
    valueNoise2(x, z, seed) * 0.55 +
    valueNoise2(x * 2.13, z * 2.13, seed + 7) * 0.3 +
    valueNoise2(x * 4.31, z * 4.31, seed + 13) * 0.15
  );
}
