# SmartWrite — Roadmap

Public roadmap. Updated as milestones are reached.

> **Status key:** `[x]` = pronto (DoD completo) · `[/]` = código existe, DoD não atendido · `[ ]` = não implementado

---

## v0.1.0 — Em progresso

**Tema:** _Feedback de clareza + publicação no Substack._

### Write Module

- [x] Estatísticas de sessão: palavras, caracteres, tempo de leitura, WPM
- [x] Meta diária de palavras com indicador de progresso
- [/] Realce inline: palavras repetidas, frases longas — visível no editor, mas sem contexto ou ação para o autor (DoD §7)
- [/] Painel Write legível — labels e valores separados, PT — mas autor não entende o que os dados significam (DoD §7)
- [/] Indicador na ribbon com contagem de issues — conta problemas mecânicos (StatsCalculator), não feedback editorial; autor não conhece as regras (DoD §7)
- [ ] Detecção de voz passiva (realce inline)

### Feedback Module

- [/] Painel lateral com trechos onde o leitor vai se perder — código existe, exibe "No feedback yet" sem orientar o autor (DoD §7, §8)
- [/] Integração com Ollama (local, offline, Apple Silicon) — código existe, nunca testado com Ollama rodando (DoD §8)
- [/] Personas ativas: `common-reader` + `critical-editor` — código existe, prompts não calibrados pelo Manual Z·Edições (DoD §7)
- [/] Análise de ritmo e cadência (burstiness) — código existe, não verificado em produção (DoD §8)
- [/] Fila de análise assíncrona — código existe, nunca testado com resposta real do Ollama (DoD §8)
- [ ] Análise de trecho selecionado — não implementado

### Publish Module

- [/] Publicação Obsidian → Substack — código existe, nunca testado end-to-end (DoD §8)
- [/] Upload automático de imagens para CDN do Substack — código existe, nunca testado (DoD §8)
- [/] Rastreamento no frontmatter (URL + data de publicação) — código existe, nunca testado (DoD §8)
- [/] Histórico de publicações — código existe, nunca testado (DoD §8)
- [/] Modos draft / publicar agora — código existe, nunca testado (DoD §8)

---

## v0.2.0

**Tema:** _Captura de voz + detecção de IA._

- [ ] Gravação de voz via whisper.cpp (offline, MIT)
- [ ] Transcrição automática → nova nota no vault
- [ ] Detecção automática de idioma (português como padrão)
- [ ] DETECT-AI: identificar artefatos de LLM no texto
- [ ] Personas adicionais além do conjunto principal
- [ ] Publicação em lote (múltiplas notas)
- [ ] Detecção de voz passiva (movida de v0.1.0)

---

## v1.0.0 — Community Release

**Tema:** _Lançamento oficial na loja de plugins do Obsidian._

- [ ] Aprovado no repositório de plugins da comunidade Obsidian
- [ ] Documentação completa (README, FAQ, CONTRIBUTING, Wiki)
- [ ] Tier Pro: todas as 23 personas, captura de voz, relatórios históricos
- [ ] Onboarding guiado (primeiro uso sem configuração manual)
- [ ] Suporte a Windows e Linux

---

## Concluído

### Infrastructure — Sessão 2026-06-09

- [x] Plugin scaffold criado (`main.ts`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `eslint.config.mts`)
- [x] Ambiente de testes configurado (`vitest` + `vitest.config.ts` + pasta `tests/`)
- [x] Scripts `test`, `test:watch`, `test:coverage`, `deploy` adicionados ao `package.json`
- [x] Vault de testes configurado (`_ smartwrite`)
- [x] API do Substack mapeada e validada via HAR real (`SUBSTACK_API.md` v2.0)
- [x] `ARQUITETURA.md` corrigida com dados reais da API

### Conformidade e Padrões — Sessão 2026-06-11/12

- [x] Conformidade com Obsidian Plugin Standards auditada contra sample oficial (Jun/2026)
- [x] tsconfig: target ES2021, moduleResolution node, strict: true
- [x] esbuild: banner adicionado ao `main.js` compilado
- [x] `normalizePath()` aplicado em paths de usuário (PersonaLoader)
- [x] Arquivos internos de agente removidos do repositório público
- [x] HAR com dados sensíveis removido do git
- [x] DoD atualizado com critérios §7 (produto) e §8 (teste no Obsidian)
- [x] Skill `obsidian-plugin-standards` atualizada com dados ao vivo do sample
- [x] 72 testes passando (lint ✅ build ✅ tests ✅)

---

> Pedidos de funcionalidade? [Abra uma issue](https://github.com/zandercattapreta/smartwrite/issues).
