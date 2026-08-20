# my pi setup

This setup is fairly opinionated, it:

- sets up github dark default as the theme
- adds firecrawl tools for searching and scraping
- updates the bottom bar to have the info I prefer to see
- adds an animated header orb (`extensions/ui-customization`)
- sanitizes Atelier/extmgr footer status text (`extensions/status-bar-fix`)
- installs community packages `pi-extmgr`, `pi-atelier`, and `pi-llama-cpp`
- defaults thinking to high, follow-ups one-at-a-time, and the other TUI prefs in `settings.example.json`
- commits `pi-atelier.json` (sidebar on startup, show tool names)
- adds skills: `background-terminals`, `subagents`, `cli-tools`, `xurl`
- adds background terminals + ui to manage them
- adds subagents to pi
- adds workflows to pi
- adds an ask user tool, which lets the model ask multiple choice questions
- adds first-class `fd` (file discovery) and `rg` (content search) tools

![Pi setup interface](assets/pi-setup.jpeg)

## Quick install (humans and agents)

Pi loads this repo from `~/.pi/agent`. Do not overwrite an existing `settings.json`; merge keys into it.

**Fresh install**

```sh
git clone https://github.com/josephbolus/pi-setup.git ~/.pi/agent
cd ~/.pi/agent
npm install
```

If `~/.pi/agent` already exists, copy this repo’s `extensions/`, `skills/`, `themes/`, `pi-atelier.json`, and `settings.example.json` into it instead of cloning over it.

**Merge settings**

`settings.json` is runtime state (gitignored). Copy every key from `settings.example.json` into it (theme, packages, thinking level, cursor, follow-up mode, and the rest). Do not replace the whole file if it already exists — keep runtime keys such as `lastChangelogVersion`. Pi will install the three `npm:` packages on the next start.

Optional, only if you run a local llama.cpp server:

```json
{
  "llamaServerUrl": "http://127.0.0.1:9931",
  "defaultProvider": "llama-server=http://127.0.0.1:9931",
  "defaultModel": "your-model-id"
}
```

Restart `pi` (or `/reload` if you are already in a session). Local extensions load from `extensions/` automatically: header orb in `ui-customization`, footer ANSI/emoji workaround in `status-bar-fix`. Skills load from `skills/`.

**Agents:** follow this section first. Then read `SETUP.md` for Firecrawl (ask the user before adding an API key; remove `extensions/firecrawl-search` if they decline), for `fd`/`rg`, and for skills that need extra CLIs (`xurl`, `cli-tools`). Do not commit `settings.json`, `auth.json`, `models.json`, or `.env`. Never copy `~/.xurl/` — that is machine-local X API secrets.
