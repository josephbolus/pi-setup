import assert from "node:assert/strict";
import { atelierSanitize, normalizeStatusText } from "./normalize.ts";

const colored = "\x1b[38;2;110;118;129m3 pkgs • ⏸ auto-update off\x1b[39m";

const leaked = atelierSanitize(colored);
assert.match(leaked, /\[38;2;110;118;129m/);
assert.match(leaked, /\[39m/);

const padded = "3 pkgs • ⏸\u2800 auto-update off";
assert.equal(normalizeStatusText(colored), padded);
assert.equal(normalizeStatusText(leaked), padded);
assert.equal(atelierSanitize(normalizeStatusText(colored)), padded);
assert.equal(normalizeStatusText("↻ hourly"), "↻\u2800 hourly");

console.log("normalize tests passed");
console.log("atelier leak:", JSON.stringify(leaked));
console.log("normalized:", JSON.stringify(normalizeStatusText(colored)));
