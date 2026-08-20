import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanStatusMap, normalizeStatusText } from "./normalize.ts";

const GET_WRAPPED = Symbol.for("status-bar-fix.getExtensionStatuses");
const SET_WRAPPED = Symbol.for("status-bar-fix.setStatus");
const FOOTER_WRAPPED = Symbol.for("status-bar-fix.setFooter");
const PROTO_WRAPPED = Symbol.for("status-bar-fix.providerProto");

type StatusUi = {
  setStatus: (key: string, text: string | undefined) => void;
  setFooter: (factory: unknown) => void;
};

function candidateProviderPaths() {
  const paths: string[] = [];
  if (typeof process.argv[1] === "string") {
    paths.push(join(dirname(process.argv[1]), "core/footer-data-provider.js"));
  }
  try {
    paths.push(
      join(
        dirname(
          fileURLToPath(import.meta.resolve("@earendil-works/pi-coding-agent")),
        ),
        "core/footer-data-provider.js",
      ),
    );
  } catch {
    // resolve may fail before jiti aliases are in place
  }
  paths.push(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../node_modules/@earendil-works/pi-coding-agent/dist/core/footer-data-provider.js",
    ),
  );
  return [...new Set(paths.filter((path) => existsSync(path)))];
}

function patchProviderModule(providerPath: string) {
  const require = createRequire(providerPath);
  const mod = require(providerPath) as {
    FooterDataProvider?: {
      prototype: {
        getExtensionStatuses: () => Map<string, string>;
        setExtensionStatus: (key: string, text: string | undefined) => void;
      } & Record<symbol, unknown>;
    };
  };
  const proto = mod.FooterDataProvider?.prototype;
  if (!proto || proto[PROTO_WRAPPED]) return Boolean(proto);
  proto[PROTO_WRAPPED] = true;

  const originalGet = proto.getExtensionStatuses;
  proto.getExtensionStatuses = function getExtensionStatuses() {
    return cleanStatusMap(originalGet.call(this));
  };

  const originalSet = proto.setExtensionStatus;
  proto.setExtensionStatus = function setExtensionStatus(
    key: string,
    text: string | undefined,
  ) {
    originalSet.call(
      this,
      key,
      text === undefined ? undefined : normalizeStatusText(text),
    );
  };
  return true;
}

export function patchFooterDataProvider() {
  let patched = false;
  for (const providerPath of candidateProviderPaths()) {
    try {
      if (patchProviderModule(providerPath)) patched = true;
    } catch {
      // Different pi installs may not have this copy.
    }
  }
  return patched;
}

function wrapGetStatuses(footerData: {
  getExtensionStatuses: () => ReadonlyMap<string, string>;
}) {
  const tagged = footerData as typeof footerData & { [GET_WRAPPED]?: true };
  if (tagged[GET_WRAPPED]) return;
  tagged[GET_WRAPPED] = true;
  const original = footerData.getExtensionStatuses.bind(footerData);
  footerData.getExtensionStatuses = () => cleanStatusMap(original());
}

export function wrapExtensionUi(ui: StatusUi) {
  const tagged = ui as StatusUi & {
    [SET_WRAPPED]?: true;
    [FOOTER_WRAPPED]?: true;
  };

  if (!tagged[SET_WRAPPED]) {
    tagged[SET_WRAPPED] = true;
    const original = ui.setStatus.bind(ui);
    ui.setStatus = (key, text) => {
      original(key, text === undefined ? undefined : normalizeStatusText(text));
    };
  }

  if (!tagged[FOOTER_WRAPPED] && typeof ui.setFooter === "function") {
    tagged[FOOTER_WRAPPED] = true;
    const originalFooter = ui.setFooter.bind(ui);
    ui.setFooter = (factory: unknown) => {
      if (!factory) return originalFooter(undefined);
      return originalFooter(
        (
          tui: unknown,
          theme: unknown,
          footerData: {
            getExtensionStatuses: () => ReadonlyMap<string, string>;
          },
        ) => {
          wrapGetStatuses(footerData);
          return (factory as Function)(tui, theme, footerData);
        },
      );
    };
  }
}
