# SmartWrite — Roadmap

Public roadmap. Updated as milestones are reached.

---

## v0.1.0 — MVP

**Theme:** _Clarity feedback + Substack publishing._

### Write Module

- [ ] Session stats: words, characters, reading time, WPM
- [ ] Daily word goal with progress indicator
- [ ] Inline highlights: repeated words, long sentences, passive voice
- [ ] Subtle ribbon indicator when feedback is available

### Feedback Module

- [ ] Sidebar panel with passages where readers get lost
- [ ] Ollama integration (local, offline, Apple Silicon)
- [ ] Active personas: `common-reader` + `critical-editor`
- [ ] Rhythm and cadence analysis (burstiness)
- [ ] Async analysis queue
- [ ] Analyze full document or selection

### Publish Module

- [ ] Obsidian → Substack publishing
- [ ] Automatic image upload to Substack CDN
- [ ] Frontmatter tracking (URL + publish date)
- [ ] Publication history log
- [ ] Draft / publish now modes

---

## v0.2.0 — Post-MVP

**Theme:** _Voice capture + AI detection._

- [ ] Voice recording via whisper.cpp (offline, MIT)
- [ ] Auto-transcription → new note in vault
- [ ] Auto language detection (Portuguese-first)
- [ ] DETECT-AI: identify LLM artifacts in text
- [ ] Additional personas beyond the core set
- [ ] Batch publishing (multiple notes)

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
