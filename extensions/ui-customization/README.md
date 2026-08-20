# ui-customization

Pi TUI extension: animated welcome orb in the header, plus a compact git/model footer. Hides the Themes settings section.

Reload after edits with `/reload`, or restart `pi`.

## Configure the orb

All orb knobs are constants at the top of `index.ts`:

```ts
const ORB_WIDTH = 30;
const ORB_CELL_ASPECT = 0.42;
const ORB_HEIGHT = orbHeightForWidth(ORB_WIDTH, ORB_CELL_ASPECT); // 13
const ORB_GLYPHS: GlyphSet = "dotField";
const ORB_PALETTE = 6;
const ORB_FPS = 12;
const ORB_SEED = 42;
const ORB_SIZE_SCALE = 1;
const ORB_TEXT_GAP = 4;
const ORB_LEFT_PAD = 15;
const TIP_MS = 4000;
```

| Constant | Default | What it does |
| --- | --- | --- |
| `ORB_WIDTH` | `30` | Glyph columns for the sphere |
| `ORB_CELL_ASPECT` | `0.42` | `cellWidth / cellHeight`. **Lower = wider**, **higher = taller** |
| `ORB_HEIGHT` | derived | Glyph rows; keep this derived from width × aspect |
| `ORB_GLYPHS` | `"dotField"` | `"dotField"` (`·•●`) or `"ascii"` (`.:-=+*#%@`) |
| `ORB_PALETTE` | `6` | Color **and** spin speed, `1`–`8` |
| `ORB_FPS` | `12` | Header animation rate (each tick redraws the TUI) |
| `ORB_SEED` | `42` | OpenSimplex seed |
| `ORB_SIZE_SCALE` | `1` | Fill fraction of the box; capped at `1` so the sphere is not clipped |
| `ORB_TEXT_GAP` | `4` | Spaces between the orb and the welcome copy |
| `ORB_LEFT_PAD` | `15` | Spaces to the left of the orb |
| `TIP_MS` | `4000` | How long each getting-started tip stays on screen |

### Proportions

`ORB_CELL_ASPECT` is the only shape control. `0.55` stretched the orb vertically on typical fonts (too tall). `0.42` matches ~7×16 cells (common in Windows Terminal / Cascadia).

```
height ≈ width × ORB_CELL_ASPECT
```

If it still looks tall, drop toward `0.38`. If it looks wide, raise toward `0.48`. `ORB_SIZE_SCALE` above `1` is ignored so the glow cannot run off the top or bottom.

### Palettes (`ORB_PALETTE`)

Changing the number changes hue **and** motion speed.

| Value | Colors | Speed |
| --- | --- | --- |
| `1` | amber | 3.4 (fast) |
| `2` | green | 1.45 |
| `3` | purple → cyan | 0.9 (slow) |
| `4` | purple | 0.9 |
| `5` | bright green | 1.45 |
| `6` | indigo → blue (default) | 1.45 |
| `7` | violet | 1.45 |
| `8` | amber | 3.4 |

Examples:

```ts
const ORB_GLYPHS: GlyphSet = "ascii";
const ORB_PALETTE = 5; // bright green
```

```ts
const ORB_WIDTH = 32;
const ORB_HEIGHT = orbHeightForWidth(ORB_WIDTH, ORB_CELL_ASPECT);
const ORB_SIZE_SCALE = 1;
```

There are no runtime keybindings. Edit the constants and `/reload`.

## Welcome line

The header shows `Welcome to Pi $HUMAN!` next to the orb, an accent `Tips for getting started` heading, **one** muted tip (cycles every `TIP_MS` through the 20-entry `TIPS` list), and an outline-only session card (`π Pi (vVERSION)`, model, directory — no fill). `/help for more` is commented out in `welcomeCopy` for now. `$HUMAN` is the first word of the GECOS name from:

```bash
getent passwd "$USER" | cut -d: -f5 | cut -d, -f1 | awk '{print $1}'
```

If that is empty, it falls back to `$USER`.

## Footer

Two lines: cwd + model on the first, context/cost/tok/s + git/PR on the second. Extension statuses from other plugins append below.

## Check

```bash
npm run check
```
