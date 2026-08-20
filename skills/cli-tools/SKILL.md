---
name: cli-tools
description: Reference for locally installed CLI dev tools — use these instead of guessing or assuming availability
---

# CLI Tools

Standard dev CLIs are installed and on PATH. Use them to search, inspect, test, and verify — do not guess or assume tools are unavailable. Prioritize `rg` over `grep` and use `ast-grep` for structural code search when needed.

## Search & Inspection

| Tool | Use For | Example |
|------|---------|---------|
| `rg` (ripgrep) | Search file contents by regex. **Prefer over grep.** | `rg "export const" --type ts` |
| `fd` | Find files/directories by name. Gitignore-aware, fast. | `fd ".env"` or `fd -e tsx` |
| `ast-grep` (sg) | Syntax-aware structural search. Finds code patterns regardless of formatting/variable names. | `sg -p 'export const \$FUNC = ...' --lang ts` |
| `bat` | Cat with syntax highlighting and line numbers. | `bat src/main.ts` |
| `jq` | Parse/filter JSON from CLI. | `cat data.json \| jq '.users[].name'` |
| `yq` | Parse/filter YAML from CLI. | `yq '.version' package.json` |
| `tree` | Directory tree visualization. | `tree -L 2 src/` |
| `fzf` | Fuzzy finder for interactive selection (pipe input). | `ls \| fzf` |

## Version Control & CI

| Tool | Use For | Example |
|------|---------|---------|
| `git` | Version control. | `git log --oneline -10` |
| `gh` | GitHub CLI — issues, PRs, repos, actions. | `gh pr list`, `gh issue create` |
| `actionlint` | Lint GitHub Actions workflow files. | `actionlint .github/workflows/*.yml` |

## Code Quality & Linting

| Tool | Use For | Example |
|------|---------|---------|
| `shellcheck` | Lint bash/sh scripts for bugs and style. | `shellcheck script.sh` |
| `shfmt` | Format shell scripts (also lints). | `shfmt -w script.sh` |
| `markdownlint` | Lint Markdown files. | `markdownlint README.md` |
| `ruff` | Python linter/formatter (fast, replaces flake8+isort+black). | `ruff check .`, `ruff format .` |

## Performance & Benchmarking

| Tool | Use For | Example |
|------|---------|---------|
| `hyperfine` | Benchmark command-line commands with statistical accuracy. | `hyperfine 'rg foo src/' 'grep -r foo src/'` |

## Package Managers & Runtimes

| Tool | Use For | Example |
|------|---------|---------|
| `node` / `npm` | JavaScript/TypeScript runtime and package manager. | `node script.js`, `npm install pkg` |
| `pnpm` | Fast, disk-efficient alternative to npm/yarn. | `pnpm add pkg` |
| `python` | Python 3 runtime. | `python script.py` |
| `uv` | Extremely fast Python package manager and resolver. | `uv pip install pkg`, `uv run script.py` |

## Containers & Testing

| Tool | Use For | Example |
|------|---------|---------|
| `docker` | Container runtime. | `docker build -t app .`, `docker run app` |
| `docker compose` | Multi-container orchestration. | `docker compose up -d` |
| `Playwright` | End-to-end browser testing (headless). | `npx playwright test` |

## Build & Automation

| Tool | Use For | Example |
|------|---------|---------|
| `make` | Task runner via Makefiles. | `make build`, `make test` |
| `pwsh` | PowerShell Core — cross-platform scripting. | `pwsh -Command 'Get-Process'` |
| `curl` | HTTP requests and file transfers. | `curl -s https://api.example.com/data \| jq .` |

## Glob

Shell glob patterns are supported for file pattern expansion (e.g., `src/**/*.ts`, `*.test.{ts,tsx}`). Use in bash commands when you need to match files by pattern rather than searching contents.

---

## Priority Rules

1. **Content search:** Always use `rg` instead of `grep`
2. **Structural code search:** Use `ast-grep` (sg) when the pattern depends on AST shape, not just text
3. **File discovery:** Use `fd` instead of `find`
4. **Python linting/formatting:** Use `ruff` — it replaces flake8, isort, and black
5. **Shell scripts:** Run `shellcheck` then `shfmt` before committing
6. **GitHub Actions:** Run `actionlint` on workflow files
7. **Benchmarks:** Use `hyperfine` for reliable timing comparisons
