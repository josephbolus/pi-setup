// OpenSimplex 2D (`makeNoise2D(seed)`).

const STRETCH = (1 / Math.sqrt(3) - 1) / 2;
const SQUISH = (Math.sqrt(3) - 1) / 2;
const NORM = 0.02127659574468085;

const GRADIENTS = [5, 2, 2, 5, -5, 2, -2, 5, 5, -2, 2, -5, -5, -2, -2, -5];

const BASES = [
  [1, 1, 0, 1, 0, 1, 0, 0, 0],
  [1, 1, 0, 1, 0, 1, 2, 1, 1],
] as const;

const LOOKUP_PAIRS = [
  0, 1, 1, 0, 4, 1, 17, 0, 20, 2, 21, 2, 22, 5, 23, 5, 26, 4, 39, 3, 42, 4, 43,
  3,
];

const CONTRIBUTIONS = [
  0, 0, 1, -1, 0, 0, -1, 1, 0, 2, 1, 1, 1, 2, 2, 0, 1, 2, 0, 2, 1, 0, 0, 0,
];

interface Contribution {
  dx: number;
  dy: number;
  xsb: number;
  ysb: number;
  next?: Contribution;
}

function lcg(seed: Uint32Array) {
  const next = new Uint32Array(1);
  next[0] = seed[0]! * 1664525 + 1013904223;
  return next;
}

function contribution(
  multiplier: number,
  xsb: number,
  ysb: number,
): Contribution {
  return {
    dx: -xsb - multiplier * SQUISH,
    dy: -ysb - multiplier * SQUISH,
    xsb,
    ysb,
  };
}

function buildLookup() {
  const contributions: Contribution[] = [];
  for (let i = 0; i < CONTRIBUTIONS.length; i += 4) {
    const baseIndex = CONTRIBUTIONS[i] ?? 0;
    const base = BASES[baseIndex] ?? BASES[0];
    let prev: Contribution | undefined;
    let last: Contribution | undefined;
    for (let j = 0; j < base.length; j += 3) {
      last = contribution(base[j]!, base[j + 1]!, base[j + 2]!);
      if (!prev) contributions[i / 4] = last;
      else prev.next = last;
      prev = last;
    }
    if (last) {
      last.next = contribution(
        CONTRIBUTIONS[i + 1]!,
        CONTRIBUTIONS[i + 2]!,
        CONTRIBUTIONS[i + 3]!,
      );
    }
  }
  const lookup: Array<Contribution | undefined> = [];
  for (let i = 0; i < LOOKUP_PAIRS.length; i += 2) {
    lookup[LOOKUP_PAIRS[i]!] = contributions[LOOKUP_PAIRS[i + 1]!];
  }
  return lookup;
}

const LOOKUP = buildLookup();

export function makeNoise2D(seed = 0) {
  const perm = new Uint8Array(256);
  const permGrad = new Uint8Array(256);
  const source = new Uint8Array(256);
  for (let i = 0; i < 256; i++) source[i] = i;

  let rng = new Uint32Array(1);
  rng[0] = seed >>> 0;
  rng = lcg(lcg(lcg(rng)));

  for (let i = 255; i >= 0; i--) {
    rng = lcg(rng);
    const r = new Uint32Array(1);
    r[0] = (rng[0]! + 31) % (i + 1);
    const pick = r[0]!;
    perm[i] = source[pick]!;
    permGrad[i] = perm[i]! & 14;
    source[pick] = source[i]!;
  }

  return function noise2D(x: number, y: number) {
    const stretchOffset = (x + y) * STRETCH;
    const xs = x + stretchOffset;
    const ys = y + stretchOffset;
    const xsb = Math.floor(xs);
    const ysb = Math.floor(ys);
    const squish = (xsb + ysb) * SQUISH;
    const dx0 = x - (xsb + squish);
    const dy0 = y - (ysb + squish);
    const xins = xs - xsb;
    const yins = ys - ysb;
    const inSum = xins + yins;
    const hash =
      (xins - yins + 1) |
      (inSum << 1) |
      ((inSum + yins) << 2) |
      ((inSum + xins) << 4);

    let value = 0;
    for (let c = LOOKUP[hash]; c; c = c.next) {
      const dx = dx0 + c.dx;
      const dy = dy0 + c.dy;
      const attn = 2 - dx * dx - dy * dy;
      if (attn > 0) {
        const px = xsb + c.xsb;
        const py = ysb + c.ysb;
        const pg = permGrad[(perm[px & 255]! + py) & 255]!;
        const grad = GRADIENTS[pg]! * dx + GRADIENTS[pg + 1]! * dy;
        value += attn * attn * attn * attn * grad;
      }
    }
    return value * NORM;
  };
}
