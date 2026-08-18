# BeeRouter - FREE AI Router & Token Saver

**Never stop coding. Save 20-40% tokens with RTK + auto-fallback to FREE & cheap AI models.**

**Connect All AI Code Tools (Claude Code, Cursor, Antigravity, Copilot, Codex, Gemini, OpenCode, Cline, OpenClaw...) to 40+ AI Providers & 100+ Models.**

[![npm](https://img.shields.io/npm/v/bee-router.svg)](https://www.npmjs.com/package/bee-router)
[![Downloads](https://img.shields.io/npm/dm/bee-router.svg)](https://www.npmjs.com/package/bee-router)
[![Docker Pulls](https://img.shields.io/docker/pulls/tonamson/bee-router.svg?logo=docker&label=Docker%20pulls)](https://hub.docker.com/r/tonamson/bee-router)
[![GHCR](https://img.shields.io/badge/GHCR-tonamson%2Fbee--router-blue?logo=github)](https://github.com/tonamson/bee-router/pkgs/container/bee-router)
[![License](https://img.shields.io/npm/l/bee-router.svg)](https://github.com/tonamson/bee-router/blob/master/LICENSE)

[🌐 GitHub](https://github.com/tonamson/bee-router) • [📖 Full Docs](https://github.com/tonamson/bee-router)

---

## 🤔 Why BeeRouter?

**Stop wasting money, tokens and hitting limits:**

- ❌ Subscription quota expires unused every month
- ❌ Rate limits stop you mid-coding
- ❌ Tool outputs (git diff, grep, ls...) burn tokens fast
- ❌ Expensive APIs ($20-50/month per provider)

**BeeRouter solves this:**

- ✅ **RTK Token Saver** - Auto-compress tool_result, save 20-40% tokens
- ✅ **Maximize subscriptions** - Track quota, use every bit before reset
- ✅ **Auto fallback** - Subscription → Cheap → Free, zero downtime
- ✅ **Multi-account** - Round-robin between accounts per provider
- ✅ **Universal** - Works with any OpenAI/Claude-compatible CLI

---

## ⚡ Quick Start

**Option 1 — npm (recommended for desktop):**

```bash
npm install -g bee-router
bee-router

# Or run directly with npx
npx bee-router
```

**Option 2 — Docker (server/VPS):**

```bash
docker run -d --name bee-router -p 20128:20128 \
  -v "$HOME/.bee-router:/app/data" -e DATA_DIR=/app/data \
  tonamson/bee-router:latest
```

Published images: [Docker Hub](https://hub.docker.com/r/tonamson/bee-router) • [GHCR](https://github.com/tonamson/bee-router/pkgs/container/bee-router) (multi-platform amd64/arm64).

🎉 Dashboard opens at `http://localhost:20128`

**2. Connect a FREE provider (no signup needed):**

Dashboard → Providers → Connect **Kiro AI** (free Claude unlimited) or **OpenCode Free** (no auth) → Done!

**3. Use in your CLI tool:**

```
Claude Code/Codex/OpenClaw/Cursor/Cline Settings:
  Endpoint: http://localhost:20128/v1
  API Key:  [copy from dashboard]
  Model:    kr/claude-sonnet-4.5
```

That's it! Start coding with FREE AI models.

---

## 🚀 CLI Options

```bash
bee-router                    # Start with default settings
bee-router --port 8080        # Custom port
bee-router --no-browser       # Don't open browser
bee-router --skip-update      # Skip auto-update check
bee-router --help             # Show all options
```

**Dashboard**: `http://localhost:20128/dashboard`

---

## 🛠️ Supported CLI Tools

Claude-Code • OpenClaw • Codex • OpenCode • Cursor • Antigravity • Cline • Continue • Droid • Roo • Copilot • Kilo Code • Gemini CLI • Qwen Code • iFlow • Crush • Crusher • Aider

Any tool supporting OpenAI/Claude-compatible API works.

---

## 💾 Data Location

- **macOS/Linux**: `~/.bee-router/db/data.sqlite`
- **Windows**: `%APPDATA%/bee-router/db/data.sqlite`
- **Docker**: `/app/data/db/data.sqlite` (mount `$HOME/.bee-router` to persist)

---

## 📚 Documentation

Full docs, advanced setup, video tutorials & development guide:

- **GitHub**: https://github.com/tonamson/bee-router
- **Full README**: https://github.com/tonamson/bee-router/blob/main/app/README.md
- **Website**: https://9router.com

---

## 🙏 Acknowledgments

- **[CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI)** - Original Go implementation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.
