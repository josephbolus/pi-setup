import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { patchFooterDataProvider, wrapExtensionUi } from "./patch.ts";

function install(ctx: {
  mode: string;
  ui: Parameters<typeof wrapExtensionUi>[0];
}) {
  if (ctx.mode !== "tui") return;
  patchFooterDataProvider();
  wrapExtensionUi(ctx.ui);
}

export default function statusBarFix(pi: ExtensionAPI) {
  patchFooterDataProvider();
  pi.on("session_start", (_event, ctx) => install(ctx));
  pi.on("resources_discover", (_event, ctx) => install(ctx));
}
