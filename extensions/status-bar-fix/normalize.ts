const OSC_PATTERN =
  /(?:\u001b\]|\u009d)(?:[^\u0007\u001b\u009c]|\u001b(?!\\))*(?:\u0007|\u001b\\|\u009c)/g;
const CSI_PATTERN = /(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g;
const ESCAPE_PATTERN = /\u001b(?:[()][0-2A-Z]|[ -/]*[@-~])/g;
const LEAKED_CSI_PATTERN = /\[(?:\d{1,4};){0,8}\d{0,4}[A-PR-TZcf-nq-uy=><~]/g;
const WIDE_STATUS_MARKERS = /([⏸↻])[\s\u2800]*/g;
// Braille blank is 1 column and is not JS `\s`, so Atelier's `.replace(/\s+/g, " ")`
// cannot collapse the gap after a double-width pause glyph.
const EMOJI_PAD = "\u2800";

export function normalizeStatusText(text: string) {
  return text
    .replace(OSC_PATTERN, "")
    .replace(CSI_PATTERN, "")
    .replace(ESCAPE_PATTERN, "")
    .replace(LEAKED_CSI_PATTERN, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "")
    .replace(WIDE_STATUS_MARKERS, `$1${EMOJI_PAD} `)
    .replace(/ {3,}/g, "  ")
    .trim();
}

export function cleanStatusMap(statuses: ReadonlyMap<string, string>) {
  const cleaned = new Map<string, string>();
  for (const [key, value] of statuses) {
    cleaned.set(key, normalizeStatusText(value));
  }
  return cleaned;
}

/** Atelier footer.ts sanitize — reproduces the leaked CSI. */
export function atelierSanitize(text: string) {
  return text
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
