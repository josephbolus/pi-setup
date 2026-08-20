// Glyph-sphere painter for the Pi header.

import { makeNoise2D } from "./noise2d.ts";

export const PALETTE_SIZE = 64;
// cellWidth / cellHeight. 0.5 is a strict 1:2 VGA cell (too tall on most
// fonts). Lower = wider/flatter orb; higher = taller.
export const CELL_ASPECT = 0.42;
export const RADIUS_PULSE = 0.055;
export const GLOW_RADIUS_SCALE = 1.06;
export const GLOW_FALLOFF = GLOW_RADIUS_SCALE - 1;
export const FIELD_RADIUS_DIV = (1 + RADIUS_PULSE) * GLOW_RADIUS_SCALE;
export const NOISE_SCALE = 20;

/** Rows that make a circle for `width` columns at `CELL_ASPECT`. */
export function orbHeightForWidth(width: number, aspect = CELL_ASPECT) {
  return Math.max(1, Math.round(width * aspect));
}

const RESET = "\x1b[0m";

export type Rgb = { r: number; g: number; b: number };
export type GlyphSet = "dotField" | "ascii";
export type ModeName =
  "low" | "medium" | "high" | "ultra" | "smart" | "puck" | "large" | "rush";
export type OrbPaletteIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Cell {
  char: string;
  fg: Rgb | null;
  bold: boolean;
}

export const GLYPHS: Record<GlyphSet, string[]> = {
  dotField: [" ", ".", "·", "·", ":", ":", "•", "•", "●", "●"],
  ascii: [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"],
};

export const MODES: Record<
  ModeName,
  { primary: Rgb; secondary: Rgb; speed: number }
> = {
  low: {
    primary: { r: 128, g: 51, b: 0 },
    secondary: { r: 255, g: 215, b: 0 },
    speed: 3.4,
  },
  medium: {
    primary: { r: 0, g: 55, b: 20 },
    secondary: { r: 61, g: 255, b: 166 },
    speed: 1.45,
  },
  high: {
    primary: { r: 26, g: 0, b: 77 },
    secondary: { r: 61, g: 212, b: 255 },
    speed: 0.9,
  },
  ultra: {
    primary: { r: 26, g: 0, b: 77 },
    secondary: { r: 216, g: 179, b: 255 },
    speed: 0.9,
  },
  smart: {
    primary: { r: 0, g: 55, b: 20 },
    secondary: { r: 0, g: 255, b: 136 },
    speed: 1.45,
  },
  puck: {
    primary: { r: 26, g: 0, b: 77 },
    secondary: { r: 102, g: 153, b: 255 },
    speed: 1.45,
  },
  large: {
    primary: { r: 42, g: 26, b: 77 },
    secondary: { r: 153, g: 102, b: 255 },
    speed: 1.45,
  },
  rush: {
    primary: { r: 128, g: 51, b: 0 },
    secondary: { r: 255, g: 215, b: 0 },
    speed: 3.4,
  },
};

export const PALETTE_ORDER = [
  "low",
  "medium",
  "high",
  "ultra",
  "smart",
  "puck",
  "large",
  "rush",
] as const satisfies readonly ModeName[];

export function paletteForIndex(index: number) {
  const clamped = Math.min(8, Math.max(1, Math.round(index)));
  const name = PALETTE_ORDER[clamped - 1] ?? "puck";
  return { name, ...MODES[name] };
}

export function lerpColor(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * k),
    g: Math.round(a.g + (b.g - a.g) * k),
    b: Math.round(a.b + (b.b - a.b) * k),
  };
}

export function makePalette(primary: Rgb, secondary: Rgb) {
  return Array.from({ length: PALETTE_SIZE }, (_, i) =>
    lerpColor(primary, secondary, i / (PALETTE_SIZE - 1)),
  );
}

export class Glow {
  readonly seed: number;
  private readonly noise2D: (x: number, y: number) => number;

  constructor(seed = Date.now()) {
    this.seed = seed;
    this.noise2D = makeNoise2D(seed);
  }

  sample(x: number, y: number, t: number, speed = 1) {
    return (
      (this.noise2D(x / NOISE_SCALE, y / NOISE_SCALE + t * speed) + 1) * 0.5
    );
  }
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

function emptyCell(): Cell {
  return { char: " ", fg: null, bold: false };
}

const paletteCache = new Map<string, Rgb[]>();

function cachedPalette(primary: Rgb, secondary: Rgb) {
  const key = `${primary.r},${primary.g},${primary.b}|${secondary.r},${secondary.g},${secondary.b}`;
  const hit = paletteCache.get(key);
  if (hit) return hit;
  const pal = makePalette(primary, secondary);
  paletteCache.set(key, pal);
  return pal;
}

let paintGrid: Cell[][] | undefined;

function acquireGrid(width: number, height: number) {
  if (
    !paintGrid ||
    paintGrid.length !== height ||
    (paintGrid[0]?.length ?? 0) !== width
  ) {
    paintGrid = Array.from({ length: height }, () =>
      Array.from({ length: width }, emptyCell),
    );
    return paintGrid;
  }
  for (const row of paintGrid) {
    for (const cell of row) {
      cell.char = " ";
      cell.fg = null;
      cell.bold = false;
    }
  }
  return paintGrid;
}

export function paintOrb(options: {
  width: number;
  height: number;
  time: number;
  agentMode?: ModeName;
  glyphSet?: GlyphSet;
  primary?: Rgb;
  secondary?: Rgb;
  speed?: number;
  glow: Glow;
  sizeScale?: number;
  colorMode?: "intensity" | "vertical";
  cellAspect?: number;
}): Cell[][] {
  const {
    width,
    height,
    time,
    glow,
    agentMode = "medium",
    glyphSet = "dotField",
    sizeScale = 1,
    colorMode = "intensity",
    cellAspect = CELL_ASPECT,
  } = options;
  const mode = MODES[agentMode];
  const pal = cachedPalette(
    options.primary ?? mode.primary,
    options.secondary ?? mode.secondary,
  );
  const glyphs = GLYPHS[glyphSet];
  const cells = acquireGrid(width, height);

  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(1, width / 2 - 1);
  const ry = Math.max(1, height / (2 * cellAspect) - 1);
  // Fit the glow + breathe pulse inside the box so sizeScale cannot clip.
  const fitRadius = Math.min(rx, ry) / FIELD_RADIUS_DIV;
  const baseRadius = Math.max(
    1,
    fitRadius * Math.max(0.08, Math.min(1, sizeScale)),
  );
  const speed = options.speed ?? mode.speed;
  const breathe = Math.sin(time * 1.35 * speed);
  const breathe01sq = (breathe * 0.5 + 0.5) ** 2;
  const radius = baseRadius * (1 + breathe * RADIUS_PULSE);
  const invR2 = 1 / (radius * radius);
  const invAspect = 1 / cellAspect;
  const brightness = 0.96 + breathe01sq * 0.16;

  const lightPhase = time * 0.45 * speed;
  const lx = -0.56 + Math.sin(lightPhase) * 0.16;
  const ly = -0.66 + Math.cos(lightPhase * 0.7) * 0.1;
  const lz = 0.6;
  const specX = Math.cos(time * 1.55 * speed) * 0.38 - 0.18;
  const specY = Math.sin(time * 1.15 * speed) * 0.25 - 0.26;
  const glowR = radius * GLOW_RADIUS_SCALE;
  const glowR2 = glowR * glowR;

  for (let row = 0; row < height; row++) {
    const rowCells = cells[row];
    if (!rowCells) continue;
    const ny = (row - cy) * invAspect;
    const ny2 = ny * ny;
    if (ny2 >= glowR2) continue;
    const halfW = Math.sqrt(glowR2 - ny2);
    const col0 = Math.max(0, Math.floor(cx - halfW));
    const col1 = Math.min(width - 1, Math.ceil(cx + halfW));
    for (let col = col0; col <= col1; col++) {
      const nx = col - cx;
      const dist2 = nx * nx + ny2;
      if (dist2 >= glowR2) continue;
      const J = Math.sqrt(dist2 * invR2);
      const outside = J > 1;

      if (outside) {
        const n1 = glow.sample(
          col * 1.35 + Math.sin(time * 1.3 * speed) * 8,
          row * 1.1 - time * 7 * speed,
          time * 1.6,
          speed,
        );
        const falloff = Math.max(0, 1 - (J - 1) / GLOW_FALLOFF);
        const lightBias = Math.max(
          0,
          0.25 + (nx / radius) * 0.85 - (ny / radius) * 0.18,
        );
        const intensity =
          falloff *
          falloff *
          (0.045 + n1 * 0.04 + lightBias * 0.12) *
          brightness;
        if (intensity < 0.055) continue;
        const palIdx = Math.min(
          PALETTE_SIZE - 1,
          Math.floor(intensity * PALETTE_SIZE * 1.8),
        );
        rowCells[col] = {
          char: glyphs[intensity > 0.14 ? 2 : 1] ?? " ",
          fg: pal[palIdx] ?? pal[0]!,
          bold: intensity > 0.72,
        };
        continue;
      }

      const ux = nx / radius;
      const uy = ny / radius;
      const uz = Math.sqrt(Math.max(0, 1 - J * J));
      const rot =
        time * 1.35 * speed +
        uz * 3.2 +
        Math.sin(uy * 4.4 + time * 0.85 * speed) * 0.7;
      const sr = Math.sin(rot);
      const cr = Math.cos(rot);
      const rxp = ux * cr - uy * sr;
      const ryp = ux * sr + uy * cr;

      const nA = glow.sample(
        rxp * radius * 1.35 + uz * 7 + Math.sin(time * 1.3 * speed) * 8,
        ryp * radius * 1.1 - time * 7 * speed,
        time * 1.6,
        speed,
      );
      const nB = glow.sample(
        rxp * radius * 0.58 - time * 9 * speed,
        ryp * radius * 1.65 + Math.cos(time * 1.05 * speed) * 6,
        time * 1.1,
        speed * 0.7,
      );

      const bump =
        Math.sin(rxp * 3.8 + ryp * 2.6 + time * 1.4 * speed) * 0.15 +
        Math.sin(ryp * 6.2 - time * 0.9 * speed) * 0.055;
      const ndotl = ux * lx + uy * ly + uz * lz + bump;
      const lambert = clamp01((ndotl + 0.08) / 1.06);
      const lambertS = lambert * lambert * (3 - lambert * 2);
      const lambertP = lambertS ** 0.82;
      const shadow = Math.max(0, 1 - lambertS) ** 1.45;
      const rim = Math.max(0, 1 - uz) ** 2.45;
      const rimLight = Math.max(0, 0.32 + ux * 1.05 - uy * 0.18) ** 1.25;
      const rimTerm = rim * rimLight;
      const crescent =
        Math.exp(
          -((ux - 0.74) * (ux - 0.74) * 34 + (uy + 0.02) * (uy + 0.02) * 2.8),
        ) * rimTerm;
      const specular = Math.exp(
        -((ux - specX) * (ux - specX) * 58 + (uy - specY) * (uy - specY) * 130),
      );
      const nMix = nA * 0.64 + nB * 0.36;
      const nPeak = Math.max(0, (nMix - 0.58) / 0.42) ** 1.7;
      const swirl1 = Math.sin(
        ryp * 11 + rxp * 3.5 + uz * 5 + time * 4.6 * speed,
      );
      const swirl2 = Math.sin(
        rxp * 8.5 - ryp * 4.5 + uz * 7 - time * 3.6 * speed,
      );
      const nDetail =
        (nMix - 0.5) * 0.12 +
        nPeak * 0.09 +
        Math.max(0, swirl1 * 0.5 + 0.5) ** 4 * 0.12 +
        Math.max(0, swirl2 * 0.5 + 0.5) ** 5 * 0.14;
      const floorI = 0.105 + (1 - J) * 0.035 + nA * 0.012;
      let intensity =
        (0.045 + lambertP * 0.72 + uz * 0.055 - shadow * 0.105) *
          (0.88 + nDetail) +
        rimTerm * 0.26 +
        crescent * 0.95 +
        specular * (0.38 + lambertP) * 1.28;
      intensity *= brightness;
      intensity = clamp01(Math.max(intensity, floorI));

      const gi = Math.max(
        1,
        Math.min(glyphs.length - 1, Math.floor(intensity * glyphs.length)),
      );
      const palT = clamp01(intensity * 0.58 + lambertP * 0.3 + rimTerm * 0.12);
      const palIdx =
        colorMode === "vertical"
          ? Math.min(
              PALETTE_SIZE - 1,
              Math.floor(clamp01(0.5 - ny / (2 * radius)) * PALETTE_SIZE),
            )
          : Math.min(PALETTE_SIZE - 1, Math.floor(palT * PALETTE_SIZE));
      rowCells[col] = {
        char: glyphs[gi] || " ",
        fg: pal[palIdx] ?? pal[PALETTE_SIZE - 1]!,
        bold: intensity > 0.72,
      };
    }
  }

  return cells;
}

export function cellsToLines(cells: Cell[][]) {
  return cells.map((row) => {
    let line = "";
    let last = "";
    for (const cell of row) {
      if (!cell.fg) {
        if (last !== "empty") {
          line += RESET;
          last = "empty";
        }
        line += " ";
        continue;
      }
      const key = `${cell.fg.r},${cell.fg.g},${cell.fg.b},${cell.bold ? 1 : 0}`;
      if (key !== last) {
        line += `\x1b[38;2;${cell.fg.r};${cell.fg.g};${cell.fg.b}m${cell.bold ? "\x1b[1m" : "\x1b[22m"}`;
        last = key;
      }
      line += cell.char;
    }
    return last === "empty" ? line : `${line}${RESET}`;
  });
}
