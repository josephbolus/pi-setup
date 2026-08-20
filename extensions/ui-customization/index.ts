import { execFileSync } from "node:child_process";
import { homedir, userInfo } from "node:os";
import { relative } from "node:path";
import type {
  ExtensionAPI,
  ExtensionContext,
  ReadonlyFooterDataProvider,
  Theme,
} from "@earendil-works/pi-coding-agent";
import {
  getCapabilities,
  hyperlink,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import {
  emptyGitInfoState,
  emptyModelInfoState,
  GIT_INFO_CHANNEL,
  MODEL_INFO_CHANNEL,
  REFRESH_CHANNEL,
  isGitInfoState,
  isModelInfoState,
} from "../shared/dashboard-state.ts";
import {
  Glow,
  cellsToLines,
  orbHeightForWidth,
  paintOrb,
  paletteForIndex,
  type GlyphSet,
} from "./src/orb.ts";

interface RenderableNode {
  children?: RenderableNode[];
  invalidate(): void;
  render(width: number): string[];
}

interface DashboardTui extends RenderableNode {
  requestRender(force?: boolean): void;
}

// Orb header. ORB_PALETTE 1–8 picks color and motion speed.
// ORB_CELL_ASPECT is cellWidth/cellHeight. Lower = wider orb, higher = taller.
const ORB_WIDTH = 30;
const ORB_CELL_ASPECT = 0.42;
const ORB_HEIGHT = orbHeightForWidth(ORB_WIDTH, ORB_CELL_ASPECT);
const ORB_GLYPHS: GlyphSet = "dotField";
const ORB_PALETTE = 6; // indigo → blue
const ORB_FPS = 12;
const ORB_SEED = 42;
const ORB_SIZE_SCALE = 1;
const ORB_TEXT_GAP = 4;
const ORB_LEFT_PAD = 15;

function firstNameFromPasswd() {
  const user = process.env.USER ?? userInfo().username;
  try {
    const gecos =
      execFileSync("getent", ["passwd", user], {
        encoding: "utf8",
        timeout: 1000,
      })
        .trim()
        .split(":")[4] ?? "";
    const name = gecos.split(",")[0]?.trim().split(/\s+/)[0];
    if (name) return name;
  } catch {
    // /etc/passwd GECOS isn't always present
  }
  return user;
}

const HUMAN = firstNameFromPasswd();
const ANSI_PATTERN =
  /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
// eslint-disable-next-line no-control-regex
const OSC_PATTERN =
  /(?:\u001b\]|\u009d)(?:[^\u0007\u001b\u009c]|\u001b(?!\\))*(?:\u0007|\u001b\\|\u009c)/g;
// eslint-disable-next-line no-control-regex
const CSI_PATTERN = /(?:\u001b\[|\u009b)[0-?]*[ -/]*[@-~]/g;
// eslint-disable-next-line no-control-regex
const ESCAPE_PATTERN = /\u001b(?:[()][0-2A-Z]|[ -/]*[@-~])/g;

function sanitizeTerminalLabel(text: string) {
  return text
    .replace(OSC_PATTERN, "")
    .replace(CSI_PATTERN, "")
    .replace(ESCAPE_PATTERN, "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
}

function hasChildren(
  component: RenderableNode,
): component is RenderableNode & { children: RenderableNode[] } {
  return Array.isArray(component.children);
}

function renderedText(component: RenderableNode) {
  try {
    return component.render(200).join("\n").replace(ANSI_PATTERN, "");
  } catch {
    return "";
  }
}

function hideThemesSection(component: RenderableNode) {
  if (!hasChildren(component)) return false;

  for (let index = 0; index < component.children.length; index += 1) {
    const child = component.children[index]!;
    const firstLine = renderedText(child)
      .split("\n")
      .find((line) => line.trim())
      ?.trim();

    if (firstLine === "[Themes]") {
      const removeCount =
        component.children[index + 1] &&
        renderedText(component.children[index + 1]!).trim() === ""
          ? 2
          : 1;
      component.children.splice(index, removeCount);
      component.invalidate();
      return true;
    }

    if (hideThemesSection(child)) return true;
  }

  return false;
}

function formatTokens(tokens: number) {
  if (tokens < 1_000) return `${tokens}`;
  if (tokens < 1_000_000) return `${Math.round(tokens / 1_000)}k`;
  return `${(tokens / 1_000_000).toFixed(1)}m`;
}

function formatDirectory(cwd: string) {
  const home = homedir();
  if (cwd === home) return "~";
  const display = cwd.startsWith(`${home}/`) ? `~/${relative(home, cwd)}` : cwd;
  return sanitizeTerminalLabel(display);
}

function padVisible(text: string, width: number) {
  const visible = visibleWidth(text);
  if (visible >= width) return truncateToWidth(text, width);
  return `${text}${" ".repeat(width - visible)}`;
}

function joinColumns(
  left: string[],
  right: string[],
  width: number,
  gap = ORB_TEXT_GAP,
) {
  const leftWidth = Math.max(
    ORB_WIDTH,
    ...left.map((line) => visibleWidth(line)),
  );
  const rightWidth = Math.max(1, width - ORB_LEFT_PAD - leftWidth - gap);
  const height = Math.max(left.length, right.length);
  const leftOffset = Math.max(0, Math.floor((height - left.length) / 2));
  const rightOffset = Math.max(0, Math.floor((height - right.length) / 2));
  const lines: string[] = [];
  for (let row = 0; row < height; row++) {
    const leftLine = left[row - leftOffset] ?? "";
    const rightLine = right[row - rightOffset] ?? "";
    lines.push(
      truncateToWidth(
        `${" ".repeat(ORB_LEFT_PAD)}${padVisible(leftLine, leftWidth)}${" ".repeat(gap)}${truncateToWidth(rightLine, rightWidth)}`,
        width,
      ),
    );
  }
  return lines;
}

function welcomeCopy(theme: Theme) {
  return [
    theme.bold(theme.fg("text", `Welcome to Pi ${HUMAN}`)),
    "",
    theme.fg("muted", "Type / to use slash commands"),
    theme.fg("muted", "Type @ to mention files"),
    theme.fg("muted", "Type ! to run a local command"),
    theme.fg("muted", "Ctrl+C to exit"),
    "",
    `${theme.fg("accent", "/help")}${theme.fg("muted", " for more")}`,
  ];
}

function columns(left: string, right: string, width: number) {
  if (!right) return truncateToWidth(left, width);

  const naturalGap = width - visibleWidth(left) - visibleWidth(right);
  if (naturalGap >= 1) return `${left}${" ".repeat(naturalGap)}${right}`;

  const leftWidth = Math.max(1, Math.floor(width * 0.45));
  const rightWidth = Math.max(1, width - leftWidth - 1);
  const fittedLeft = truncateToWidth(left, leftWidth);
  const fittedRight = truncateToWidth(right, rightWidth);
  const gap = Math.max(
    1,
    width - visibleWidth(fittedLeft) - visibleWidth(fittedRight),
  );
  return truncateToWidth(
    `${fittedLeft}${" ".repeat(gap)}${fittedRight}`,
    width,
  );
}

export default function uiCustomization(pi: ExtensionAPI) {
  let title = "pi";
  let modelInfo = emptyModelInfoState();
  let gitInfo = emptyGitInfoState();
  let requestRender: (() => void) | undefined;
  let activeTui: DashboardTui | undefined;
  let themeRemovalTimers: Array<ReturnType<typeof setTimeout>> = [];

  const stopModelListener = pi.events.on(MODEL_INFO_CHANNEL, (value) => {
    if (!isModelInfoState(value)) return;
    modelInfo = value;
    requestRender?.();
  });

  const stopGitListener = pi.events.on(GIT_INFO_CHANNEL, (value) => {
    if (!isGitInfoState(value)) return;
    gitInfo = value;
    requestRender?.();
  });

  function scheduleThemeRemoval(tui: DashboardTui) {
    for (const timer of themeRemovalTimers) clearTimeout(timer);
    themeRemovalTimers = [];

    for (const delay of [0, 50, 250, 1_000]) {
      themeRemovalTimers.push(
        setTimeout(() => {
          if (hideThemesSection(tui)) tui.requestRender(true);
        }, delay),
      );
    }
  }

  function install(ctx: ExtensionContext) {
    if (ctx.mode !== "tui") return;

    ctx.ui.setHeader((tui, theme) => {
      activeTui = tui;
      requestRender = () => tui.requestRender();
      scheduleThemeRemoval(tui);

      const glow = new Glow(ORB_SEED);
      const palette = paletteForIndex(ORB_PALETTE);
      const started = Date.now();
      const welcome = welcomeCopy(theme);
      const frameMs = 1000 / ORB_FPS;
      let cached: { frame: number; width: number; lines: string[] } | undefined;
      const timer = setInterval(() => tui.requestRender(), frameMs);
      timer.unref();

      return {
        render(width: number) {
          const frame = Math.floor((Date.now() - started) / frameMs);
          if (cached && cached.frame === frame && cached.width === width) {
            return cached.lines;
          }
          const orb = cellsToLines(
            paintOrb({
              width: ORB_WIDTH,
              height: ORB_HEIGHT,
              time: frame * (1 / ORB_FPS),
              agentMode: palette.name,
              glyphSet: ORB_GLYPHS,
              sizeScale: ORB_SIZE_SCALE,
              cellAspect: ORB_CELL_ASPECT,
              glow,
            }),
          );
          const lines = ["", ...joinColumns(orb, welcome, width), ""];
          cached = { frame, width, lines };
          return lines;
        },
        invalidate() {
          cached = undefined;
        },
        dispose() {
          clearInterval(timer);
        },
      };
    });

    ctx.ui.setFooter((tui, theme, footerData: ReadonlyFooterDataProvider) => {
      requestRender = () => tui.requestRender();

      return {
        invalidate() {},
        render(width: number) {
          const directory = theme.fg("text", formatDirectory(ctx.cwd));
          const fileLabel = gitInfo.changedFiles === 1 ? "file" : "files";
          let git = gitInfo.branch
            ? `${gitInfo.branch} · ${gitInfo.changedFiles} ${fileLabel} changed`
            : "";

          if (gitInfo.pullRequest) {
            const prLabel = `PR #${gitInfo.pullRequest.number}`;
            const linkedPr = getCapabilities().hyperlinks
              ? hyperlink(prLabel, gitInfo.pullRequest.url)
              : prLabel;
            git += ` · ${linkedPr}`;
          }

          const contextPercent =
            modelInfo.contextPercent === null
              ? "?"
              : `${Math.round(modelInfo.contextPercent)}`;
          const contextWindow =
            modelInfo.contextWindow > 0
              ? formatTokens(modelInfo.contextWindow)
              : "?";
          const tps =
            modelInfo.tokensPerSecond === null
              ? "— tok/s"
              : `${Math.round(modelInfo.tokensPerSecond)} tok/s`;
          const usage = `${contextPercent}%/${contextWindow} · $${modelInfo.cost.toFixed(2)} · ${tps}`;
          const model = modelInfo.provider
            ? `${modelInfo.provider}/${modelInfo.modelId} · ${modelInfo.thinking}`
            : modelInfo.modelId;

          const lines = [
            columns(directory, theme.fg("muted", model), width),
            columns(theme.fg("muted", usage), theme.fg("muted", git), width),
          ];

          // Extension statuses render after the two dashboard lines, one per row.
          const statuses = footerData.getExtensionStatuses();
          const statusLines = Array.from(statuses.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .flatMap(([, text]) => text.split("\n"));
          for (const statusLine of statusLines) {
            lines.push(
              truncateToWidth(statusLine, width, theme.fg("dim", "...")),
            );
          }

          return lines;
        },
      };
    });

    ctx.ui.setTitle(`pi · ${title}`);
    pi.events.emit(REFRESH_CHANNEL, undefined);
  }

  pi.on("session_start", (_event, ctx) => {
    title = formatDirectory(ctx.cwd);
    modelInfo = emptyModelInfoState();
    gitInfo = emptyGitInfoState();
    install(ctx);
  });

  pi.on("resources_discover", () => {
    if (activeTui) scheduleThemeRemoval(activeTui);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    stopModelListener();
    stopGitListener();
    for (const timer of themeRemovalTimers) clearTimeout(timer);
    themeRemovalTimers = [];
    activeTui = undefined;
    requestRender = undefined;
    if (ctx.mode === "tui") {
      ctx.ui.setHeader(undefined);
      ctx.ui.setFooter(undefined);
    }
  });
}
