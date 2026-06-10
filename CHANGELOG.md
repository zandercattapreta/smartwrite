# Changelog

All notable changes to SmartWrite will be documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [SmartWrite Versioning Convention](https://github.com/zandercattapreta/smartwrite/blob/main/CONTRIBUTING.md#versioning):
- `PATCH (0.0.X)` → local vault testing
- `MINOR (0.X.0)` → GitHub push
- `MAJOR (X.0.0)` → Obsidian Community Store release

---

## [0.1.0] — 2026-06-10

### Added

#### Módulo Write
- `StatsCalculator` — contagem de palavras, chars, leitura (200wpm), WPM, frases longas, palavras repetidas
- `TextHighlighter` — extensão CodeMirror 6 para highlight inline de frases longas e palavras repetidas
- `WriteView` — painel lateral com stats em tempo real, meta diária e barra de progresso

#### Módulo Feedback
- `OllamaClient` — cliente HTTP para Ollama local via `requestUrl` nativo (sem fetch, sem CORS)
- `PersonaLoader` — personas bundled com fallback para vault (duck typing para testabilidade)
- `PersonaRunner` — executa persona, faz parse JSON, **nunca** propaga exceção
- `AnalysisQueue` — fila FIFO concorrência=1, cancel-on-new-request, emite `smartwrite:analysis-ready`
- `CadenceAnalyzer` — análise rítmica pura: burstiness e frases monótonas
- `FeedbackView` — painel lateral com resultados por persona, badges de severity, botão "Analisar"
- Personas bundled: `common-reader` (clareza, engajamento) e `critical-editor` (estrutura, ritmo)

#### Módulo Publish
- `MarkdownConverter` — Markdown → ProseMirror JSON (formato Substack), função pura sem imports de `obsidian`
- `SubstackClient` — HTTP client com `connect.sid`, timeout 30s, tratamento 401/403
- `ImageUploader` — resolve imagens locais (wikilink + path relativo) e faz upload para CDN Substack
- `FrontmatterWriter` — escreve `substack_url` e `published_at` via `processFrontMatter`
- `PublicationLog` — log append-only em `smartwrite-log.json`
- `PublishModal` — modal de confirmação com modo (draft/publish), audiência, aviso de re-publicação

#### Infraestrutura
- `types.ts` — interfaces centralizadas dos 3 módulos
- `settings.ts` — SmartWriteSettings completo + SmartWriteSettingTab com aviso de segurança do cookie
- `state.ts` — SessionState singleton com wrapper get/update
- `main.ts` — integra os 3 módulos: 3 comandos, 2 views, ribbon
- 72 testes em 5 suítes (StatsCalculator, CadenceAnalyzer, PersonaLoader, PersonaRunner, MarkdownConverter)
- Bundle: **29KB** (limite: 500KB)

---

## [0.0.1] — 2026-06-09

### Added
- Initial scaffold: Obsidian Plugin boilerplate
- Build configuration: esbuild, tsconfig, ESLint with `eslint-plugin-obsidianmd`
- Repository structure established
- Product documentation: PRD, VISAO_DE_PRODUTO, FUNCIONALIDADES, IDEACAO
- Public documentation: README, ROADMAP, BACKLOG, FAQ, CONTRIBUTING
