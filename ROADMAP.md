# SmartWrite — Roadmap

Public roadmap. Updated as milestones are reached.

---

## v0.1.0 — In Progress

**Theme:** _Clarity feedback + Substack publishing._

### Write Module

- [x] Session stats: words, characters, reading time, WPM
- [x] Daily word goal with progress indicator
- [x] Inline highlights: repeated words, long sentences
- [ ] Passive voice detection (inline highlight)
- [ ] Subtle ribbon indicator when feedback is available
- [ ] Readable Write panel UI (legible label/value layout)

### Feedback Module

- [x] Sidebar panel with passages where readers get lost
- [x] Ollama integration (local, offline, Apple Silicon)
- [x] Active personas: `common-reader` + `critical-editor`
- [x] Rhythm and cadence analysis (burstiness)
- [x] Async analysis queue
- [x] Analyze full document or selection

### Publish Module

- [x] Obsidian → Substack publishing
- [x] Automatic image upload to Substack CDN
- [x] Frontmatter tracking (URL + publish date)
- [x] Publication history log
- [x] Draft / publish now modes

---

## v0.2.0

**Theme:** _Voice capture + AI detection._

- [ ] Voice recording via whisper.cpp (offline, MIT)
- [ ] Auto-transcription → new note in vault
- [ ] Auto language detection (Portuguese-first)
- [ ] DETECT-AI: identify LLM artifacts in text
- [ ] Additional personas beyond the core set
- [ ] Batch publishing (multiple notes)
- [ ] Passive voice detection (moved from v0.1.0)

---

## v1.0.0 — Community Release

**Theme:** _Official Obsidian Community Store launch._

- [ ] Approved in Obsidian Community Plugin repository
- [ ] Full documentation (README, FAQ, CONTRIBUTING, Wiki)
- [ ] Pro tier: all 23 personas, voice capture, historical reports
- [ ] Guided onboarding (first use without manual config)
- [ ] Windows and Linux support

---

## Completed

### v0.1.0 Core — Sessão 2026-06-10

- [/] Write module: `StatsCalculator`, `TextHighlighter`, `WriteView` — código existe, DoD pendente
- [/] Feedback module: `OllamaClient`, `PersonaLoader`, `PersonaRunner`, `AnalysisQueue`, `CadenceAnalyzer`, `FeedbackView` — código existe, DoD pendente
- [/] Publish module: `SubstackClient`, `MarkdownConverter`, `ImageUploader`, `FrontmatterWriter`, `PublicationLog`, `PublishModal` — código existe, DoD pendente
- [/] Bundled personas: `common-reader` + `critical-editor` — código existe, DoD pendente
- [x] Settings: todos os campos dos 3 módulos configuráveis via SettingTab
- [x] Agent skills criados: `dod`, `smartwrite-context`, `ollama-integration`, `persona-system`, `substack-api`, `testing-protocol`

### Infrastructure — Sessão 2026-06-09

- [x] Plugin scaffold criado (`main.ts`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mts`)
- [x] Conformidade com Obsidian Plugin Standards auditada e corrigida
- [x] Ambiente de testes configurado (`vitest` + `vitest.config.ts` + pasta `tests/`)
- [x] Scripts `test`, `test:watch`, `test:coverage`, `deploy` adicionados ao `package.json`
- [x] Vault de testes configurado (`_ smartwrite` — `/Users/zander/Documents/_ coding/_ smartwrite`)
- [x] Skill de Versioning atualizada para plugin único (arquitetura antiga removida)
- [x] API do Substack mapeada e validada via HAR real (`SUBSTACK_API.md` v2.0)
- [x] `ARQUITETURA.md` corrigida com dados reais da API

---

> Have a feature request? [Open an issue](https://github.com/zandercattapreta/smartwrite/issues).
