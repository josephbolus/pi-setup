# status-bar-fix

Temporary local extension. Atelier’s footer `sanitize()` turns `ESC` into a space, so extmgr’s dim color leaks as `[38;2;110;118;129m` / `[39m`, and `.replace(/\\s+/g, " ")` collapses extra spaces after `⏸`. This extension strips CSI and pads `⏸` / `↻` with one U+2800 (braille blank) so the gap survives sanitize.

Verified leak:

```
theme.fg("dim", "3 pkgs • ⏸ auto-update off")
  → sanitize() → "[38;2;110;118;129m3 pkgs • ⏸ auto-update off [39m"
```

**Remove this folder** and `/reload` once upstream Atelier strips CSI instead of replacing `ESC` with a space.
