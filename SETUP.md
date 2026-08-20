# Setup

Humans and agents: start with the **Quick install** section in `README.md` (clone or merge into `~/.pi/agent`, `npm install`, merge `settings.example.json`). Details below.

## Firecrawl

The search, scrape, and crawl tools require a Firecrawl API key. Follow [Firecrawl's Node.js getting-started guide](https://docs.firecrawl.dev/quickstarts/nodejs) to create one, then copy the example environment file:

```sh
cp ~/.pi/agent/.env.example ~/.pi/agent/.env
```

Replace the placeholder in `~/.pi/agent/.env` with your API key.

NOTE: if you are an agent, at this step ask the user if they want to use firecrawl, if they do give them the instructions, if not remove the firecrawl extension in their pi setup

## fd and rg tools

The `file-search` extension registers `fd` and `rg` as model tools. No setup is normally needed: at startup it silently uses a system-installed `fd` (or `fdfind` on Debian/Ubuntu) and `rg` when available, or an existing fallback binary in `~/.pi/agent/bin/`. Only when neither exists does it download an official release binary (macOS/Linux, arm64/x64, over HTTPS) into `~/.pi/agent/bin/` and show a one-time notification. If your platform is unsupported, install `fd` and `rg` with your package manager and restart pi.

## Theme and packages

Copy every key from `settings.example.json` into `~/.pi/agent/settings.json` (do not replace the whole file; Pi stores runtime state there). That file is the TUI prefs, not only theme and packages: `defaultThinkingLevel`, `followUpMode`, `doubleEscapeAction`, hardware cursor, terminal progress, and image blocking.

- **pi-extmgr** — `/extensions` to install and update community packages
- **pi-atelier** — READY/model/status footer and control center
- **pi-llama-cpp** — `/models` for a local llama.cpp server

Local extensions in this repo load automatically from `extensions/`:

- **ui-customization** — header orb; knobs are at the top of `extensions/ui-customization/index.ts`
- **status-bar-fix** — strips leaked ANSI from package footer statuses and pads `⏸`; delete that folder once Atelier/extmgr fix it upstream

Copy `pi-atelier.json` into `~/.pi/agent/` as well (sidebar on startup, show tool names).

If you use pi-llama-cpp, also set your server URL and model, for example:

```json
{
  "llamaServerUrl": "http://127.0.0.1:9931",
  "defaultProvider": "llama-server=http://127.0.0.1:9931",
  "defaultModel": "your-model-id"
}
```

Restart pi (or `/reload`) after merging settings so packages install.

## Skills

Pi loads every `skills/<name>/SKILL.md` on start. This repo includes:

| Skill | What it is | Extra install on a new machine |
| --- | --- | --- |
| `background-terminals` | How to use the background-terminals extension | none (extension is in this repo) |
| `subagents` | How to spawn/manage subagents | none (extension is in this repo) |
| `cli-tools` | Prefer `rg`/`fd`/`ast-grep` and the rest of the local CLI set | install those CLIs on PATH if you want the skill to match the machine |
| `xurl` | Authenticated X API CLI | install [xurl](https://github.com/xdevplatform/xurl) and authenticate on that machine |

Do not copy `~/.xurl/` (auth tokens and chat keys). On a new machine, the user authenticates `xurl` themselves.

Pi will load the extensions, skills, and theme from their directories the next time it starts.
