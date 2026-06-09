<div align="center">

# SmartWrite

**The writing co-pilot that lives in Obsidian.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-7C3AED)](https://obsidian.md)
[![Status: In Development](https://img.shields.io/badge/Status-In%20Development-orange)]()

*Read your text. Show where readers get lost. Publish to Substack when you're ready.*

</div>

---

## What is SmartWrite?

SmartWrite is an open source Obsidian plugin for writers who publish regularly. It combines three things no other plugin offers together:

1. **Clarity feedback** — A sidebar panel that shows exactly where your reader will get confused, get bored, or lose the thread. Powered by your own editorial personas via Ollama (100% local, no data leaves your machine).

2. **Substack publishing** — Publish directly from Obsidian to Substack with one click. Images upload automatically. Frontmatter tracks what was published where and when.

3. **Voice capture** — Record an idea by voice, get a transcribed note in your vault. Powered by whisper.cpp (offline, Apple Silicon native).

---

## Features

### ✍️ Write Module
- Word count, characters, estimated reading time, WPM
- Daily word goal tracking
- Inline highlights: repeated words, long sentences, passive voice
- Subtle ribbon indicator when there's feedback to review

### 🔍 Feedback Module
- Sidebar panel listing problem passages
- Powered by **Ollama** — runs entirely on your machine
- Calibrated to **your** editorial voice via curated personas
- Async analysis queue — keep writing while AI processes in background
- Analyze full document or selected passage

### 📤 Publish Module
- One-click Obsidian → Substack publishing
- Automatic image upload to Substack CDN
- Frontmatter tracking (URL + publish date)
- Publication history log
- Draft / scheduled / publish now modes

### 🎙 Voice Module *(Post-MVP)*
- Record ideas by voice
- Auto-transcription via whisper.cpp (offline, MIT license)
- Auto-language detection (Portuguese-first)
- Creates a separate note in your vault for later refinement

---

## Requirements

- [Obsidian](https://obsidian.md) v0.15.0+
- [Ollama](https://ollama.ai) (for AI feedback features)
- macOS (primary support) — Windows/Linux planned for v1.0

---

## Installation

### From Community Plugins *(coming soon)*
1. Open Obsidian Settings → Community Plugins
2. Search for "SmartWrite"
3. Install and enable

### Manual Installation
```bash
# Clone to your vault's plugins folder
git clone https://github.com/zandercattapreta/smartwrite \
  /path/to/vault/.obsidian/plugins/smartwrite

# Install dependencies and build
cd /path/to/vault/.obsidian/plugins/smartwrite
npm install && npm run build
```

Then enable the plugin in Obsidian Settings → Community Plugins.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full version roadmap.

| Version | Theme | Status |
|---|---|---|
| v0.1.0 | Feedback + Substack publishing | 🔨 In development |
| v0.2.0 | Voice capture + DETECT-AI | 📋 Planned |
| v1.0.0 | Obsidian Community Store + Pro tier | 📋 Planned |

---

## Contributing

SmartWrite is MIT licensed and open to contributions. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

---

## License

[MIT](LICENSE) © Zander Catta Preta / Z·Edições
