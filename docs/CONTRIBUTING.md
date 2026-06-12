# Contributing to SmartWrite

Thank you for your interest in contributing! SmartWrite is MIT licensed and welcomes contributions of all kinds.

---

## Ways to contribute

- **Bug reports** — Found something broken? [Open an issue](https://github.com/zandercattapreta/smartwrite/issues)
- **Feature requests** — Have an idea? Check the [backlog](BACKLOG.md) first, then open an issue
- **Code** — Pick an open issue and submit a pull request
- **Documentation** — Improve the README, FAQ, or wiki
- **Personas** — Create and share editorial personas for the community

---

## Development setup

### Prerequisites

- Node.js 18+
- npm 9+
- Obsidian v0.15.0+
- [Ollama](https://ollama.ai) (for testing AI features)

### Getting started

```bash
# Clone the repository
git clone https://github.com/zandercattapreta/smartwrite
cd smartwrite

# Install dependencies
npm install

# Start development build (watch mode)
npm run dev
```

### Deploy to your test vault

```bash
# Copy compiled files to your vault
cp main.js manifest.json styles.css \
  "/path/to/your/vault/.obsidian/plugins/smartwrite/"
```

Then reload the plugin in Obsidian (Settings → Community Plugins → SmartWrite → Reload).

### Available scripts

```bash
npm run dev      # Watch mode — rebuilds on file changes
npm run build    # Production build (type-check + minify)
npm run lint     # ESLint with obsidian-plugin rules
npm run version  # Bump version (syncs manifest.json + versions.json)
```

---

## Code standards

SmartWrite follows strict engineering standards. Before submitting a PR, ensure:

### Every new file starts with the header contract
```typescript
// ==============================================================================
// SCRIPT: [filename]
// DESCRIÇÃO: [clear objective in one line]
// CHAMADO POR: [origin: main.ts, command, ribbon, Obsidian event, etc.]
// TRAZ (CHAMA/IMPORTA): [main dependencies this file uses]
// CONTRATO (RESPOSTA ESPERADA): [what this module delivers: UI, data, side-effect]
// ==============================================================================
```

### Code quality checklist
- [ ] Header contract present on all new `.ts` files
- [ ] All logic commented step-by-step (debug-ready)
- [ ] Interfaces and shared types in `src/types.ts`
- [ ] No `any` types without explicit justification
- [ ] `const`/`let` only — never `var`
- [ ] `async/await` — never `.then()` chains
- [ ] No hardcoded colors — use Obsidian CSS variables (`var(--text-normal)`)
- [ ] No `workspace.activeLeaf` — use `getActiveViewOfType()`
- [ ] Unit tests for new pure functions
- [ ] `npm run build` passes without errors
- [ ] `npm run lint` passes without errors

### Language convention
- **PT-BR** for comments, documentation, commit messages (optional)
- **EN-US** for code: variable names, function names, classes, interfaces

---

## Versioning

SmartWrite uses semantic versioning with a specific convention:

| Digit | When |
|---|---|
| `PATCH (0.0.X)` | Each update for local vault testing |
| `MINOR (0.X.0)` | Each push to GitHub |
| `MAJOR (X.0.0)` | When ready for Obsidian Community Store |

Use `npm run version` to bump — it syncs `manifest.json`, `package.json`, and `versions.json` automatically.

---

## Pull Request process

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes following the code standards above
3. Ensure build and lint pass: `npm run build && npm run lint`
4. Write or update tests as needed
5. Submit the PR with a clear description of what changed and why

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
