# SmartWrite

> Write, analyze, and publish — all from your Obsidian vault.

SmartWrite is a unified Obsidian plugin that covers the full lifecycle of a writer's text: from AI-assisted writing and deep manuscript analysis to automated multi-platform publishing.

## Features

- 📊 **Real-time writing stats** — word count, readability, daily goals
- 🤖 **Local AI feedback** — persona-based critique via Ollama (no data leaves your machine)
- 📖 **Manuscript analysis** — deep structural analysis for long-form works (50k–500k words)
- 🚀 **One-click publishing** — Substack, WordPress and more, directly from your vault

## Installation

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/zandercattapreta/smartwrite/releases/latest)
2. Create the folder `<vault>/.obsidian/plugins/smartwrite/`
3. Copy the downloaded files into that folder
4. Enable the plugin in Obsidian Settings → Community Plugins

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
npm run lint     # lint check
```

## License

MIT
