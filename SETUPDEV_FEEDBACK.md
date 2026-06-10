# SETUPDEV — Módulo Feedback

**Plugin:** SmartWrite
**Módulo:** Feedback (Módulo 2 de 3)
**Pré-requisito:** Módulo Write implementado. Leia `_docs/ARQUITETURA.md` antes de começar.

---

## O que este módulo faz

O Módulo Feedback analisa o texto com IA local (Ollama) e indica onde o leitor vai se perder. Roda em background — nunca bloqueia a escrita. Usa personas para dar perspectivas diferentes ao texto.

**Do ponto de vista do usuário:**

> Clica em "Analisar". O painel lateral mostra passagens problemáticas com a perspectiva de um leitor comum e de um editor crítico. A análise roda enquanto continua escrevendo — sem loading spinner bloqueante.

---

## Pré-condição: Ollama rodando localmente

O usuário precisa ter o Ollama instalado (`https://ollama.com`) com o modelo configurado nas Settings (default: `qwen2.5`).

```bash
# Verificar se Ollama está rodando
curl http://localhost:11434/api/version

# Baixar modelo se necessário
ollama pull qwen2.5
```

O plugin nunca instala ou gerencia o Ollama — apenas consome o endpoint HTTP local.

---

## Arquivos a criar

```
src/
├── personas/                       ← CRIAR pasta
│   ├── common-reader.ts            ← CRIAR — system prompt bundled
│   └── critical-editor.ts          ← CRIAR — system prompt bundled
└── modules/
    └── feedback/
        ├── OllamaClient.ts         ← CRIAR — HTTP client para Ollama
        ├── PersonaLoader.ts        ← CRIAR — Carrega persona (vault ?? bundled)
        ├── PersonaRunner.ts        ← CRIAR — Executa persona → FeedbackResult[]
        ├── AnalysisQueue.ts        ← CRIAR — Fila assíncrona não-bloqueante
        ├── CadenceAnalyzer.ts      ← CRIAR — Análise rítmica sem IA
        └── FeedbackView.ts         ← CRIAR — ItemView do painel lateral
```

---

## Contratos de cada arquivo

### `src/personas/common-reader.ts`

```typescript
// System prompt da persona "leitor comum"
// Exportado como string — compilado no bundle
export const COMMON_READER_PROMPT = `
Você é um leitor típico do Substack: adulto, culto, mas sem expertise no assunto.
Lê em diagonal. Perde o fio com parágrafos longos ou raciocínios implícitos.

Ao analisar o texto, identifique:
- Onde você travaria e teria vontade de fechar a aba
- Termos que precisariam de explicação
- Saltos lógicos que confundem

Responda em JSON com esta estrutura:
[{"excerpt": "trecho exato", "issue": "descrição do problema", "severity": "low|medium|high"}]
`.trim()
```

### `src/personas/critical-editor.ts`

```typescript
// System prompt da persona "editor crítico"
export const CRITICAL_EDITOR_PROMPT = `
Você é um editor experiente de não-ficção.
Analisa estrutura, ritmo, clareza e precisão.

Ao analisar o texto, identifique:
- Frases redundantes ou que não adicionam informação
- Quebras de ritmo (troca brusca de cadência)
- Afirmações vagas que precisam de evidência
- Parágrafos de transição fraca

Responda em JSON com esta estrutura:
[{"excerpt": "trecho exato", "issue": "descrição do problema", "severity": "low|medium|high"}]
`.trim()
```

---

### `src/modules/feedback/OllamaClient.ts`

HTTP client para o Ollama local. Sem dependência de `axios` ou similar — `fetch` nativo.

```typescript
// POST http://localhost:11434/api/generate
// Suporta streaming (response line-by-line NDJSON)
// Timeout: 60s (análise pode demorar)
// Retorna: string (resposta completa da IA)

interface OllamaRequest {
  model: string;
  prompt: string;
  system: string;
  stream: boolean;  // false no MVP — resposta completa de uma vez
}

async generate(request: OllamaRequest): Promise<string>
async checkHealth(): Promise<boolean>  // GET /api/version → true se 200
```

---

### `src/modules/feedback/PersonaLoader.ts`

Duas camadas: vault (prioridade) → bundled (fallback).

```typescript
// Se settings.personasVaultPath estiver preenchido:
//   Lê vault/<path>/<personaId>.md
//   Faz parse do frontmatter via app.vault.read() + parseYaml()
//   Extrai bloco de texto após "## Prompt do sistema"
// Se não encontrar → usa persona bundled (src/personas/)

async load(personaId: string, app: App, settings: SmartWriteSettings): Promise<Persona>
```

Formato esperado no vault:

````markdown
---
id: common-reader
nome: Common Reader
---

## Prompt do sistema

```text
[conteúdo do system prompt]
```
````

````

---

### `src/modules/feedback/PersonaRunner.ts`
Orquestra a execução de uma persona em um texto.

```typescript
// 1. Recebe texto + persona
// 2. Monta prompt: systemPrompt + "\n\nTexto:\n" + text
// 3. Chama OllamaClient.generate()
// 4. Faz parse da resposta JSON → FeedbackResult[]
// 5. Retorna FeedbackResult[] (vazio se parse falhar — never throw)

async run(text: string, persona: Persona, model: string): Promise<FeedbackResult[]>
````

> **Regra:** Se a resposta do Ollama não for JSON válido, retorna `[]` e loga o erro. Nunca propaga exceção para o usuário como resultado de falha de parse.

---

### `src/modules/feedback/AnalysisQueue.ts`

Fila assíncrona. Garante que a escrita nunca trava enquanto a IA processa.

```typescript
// Fila FIFO com concorrência 1 (uma análise por vez)
// Se o usuário acionar análise enquanto outra roda → cancela a anterior
// Emite evento ao concluir: app.workspace.trigger('smartwrite:analysis-ready', results)

enqueue(text: string, personaId: string): void
cancel(): void
isRunning(): boolean
```

---

### `src/modules/feedback/CadenceAnalyzer.ts`

Análise rítmica **sem IA**. Funções puras testáveis.

```typescript
// Burstiness: variância no tamanho das frases
// Alto burstiness = bom (mistura de curtas e longas)
// Baixo burstiness = texto monótono (todas as frases parecidas)

calculateBurstiness(text: string): number  // 0.0–1.0
getSentenceLengths(text: string): number[]
identifyMonotonousBlocks(text: string): Range[]  // blocos com burstiness < 0.3
```

---

### `src/modules/feedback/FeedbackView.ts`

`ItemView` do painel lateral.

```typescript
// VIEW_TYPE = "smartwrite-feedback"
// Exibe: lista de FeedbackResult[] agrupados por persona
// Cada item: trecho problemático + descrição + badge de severidade
// Botão "Analisar" → AnalysisQueue.enqueue()
// Estado "Analisando..." enquanto fila processa
// Atualiza ao receber evento: smartwrite:analysis-ready
```

---

### Expansão do `main.ts`

Adicionar no `onload()`:

```typescript
// 1. Instanciar OllamaClient com settings.ollamaUrl
// 2. Instanciar PersonaLoader
// 3. Instanciar AnalysisQueue
// 4. Registrar FeedbackView via this.registerView()
// 5. Registrar listener smartwrite:analysis-ready → FeedbackView.render()
// 6. Registrar comando "SmartWrite: Analisar com persona ativa"
// 7. Registrar comando "SmartWrite: Abrir painel Feedback"
```

---

## Fluxo de dados

```
Usuário clica "Analisar"
      ↓
PersonaLoader.load(personaId)       → vault ?? bundled
      ↓
AnalysisQueue.enqueue(text, persona)
      ↓
[background — não bloqueia o editor]
PersonaRunner.run(text, systemPrompt)
      ↓
OllamaClient.generate(model, prompt) → POST localhost:11434/api/generate
      ↓
FeedbackResult[] parseado
      ↓
app.workspace.trigger('smartwrite:analysis-ready', results)
      ↓
FeedbackView.render(results)
```

---

## Testes obrigatórios

Criar em `tests/feedback/`:

```typescript
// CadenceAnalyzer.test.ts
describe('calculateBurstiness', () => {
    it('retorna valor alto para texto com frases variadas')
    it('retorna valor baixo para texto com frases uniformes')
    it('retorna 0 para texto vazio')
})

// PersonaLoader.test.ts (mock do vault)
describe('PersonaLoader', () => {
    it('retorna persona bundled quando vaultPath está vazio')
    it('retorna persona bundled quando arquivo do vault não existe')
    it('prioriza persona do vault quando arquivo existe e é válido')
})

// PersonaRunner.test.ts (mock do OllamaClient)
describe('PersonaRunner', () => {
    it('retorna [] quando Ollama retorna JSON inválido')
    it('parseia corretamente resposta JSON válida')
    it('nunca propaga exceção')
})
```

> `OllamaClient`, `AnalysisQueue` e `FeedbackView` são testados manualmente no vault de testes com Ollama rodando.

---

## Definição de pronto (DoD)

- [ ] `npm run lint` → 0 erros
- [ ] `npm run build` → build sem erros
- [ ] `npm test` → testes de `CadenceAnalyzer`, `PersonaLoader`, `PersonaRunner` passando
- [ ] `npm run deploy` → plugin carregado no vault local (`_ smartwrite`)
- [ ] `OllamaClient.checkHealth()` → `true` com Ollama rodando
- [ ] Análise completa de um texto real no vault de testes (com `qwen2.5`)
- [ ] Painel Feedback exibe resultados agrupados por persona
- [ ] Análise roda em background sem travar o editor
- [ ] Fallback para persona bundled funciona sem vault path configurado
- [ ] Bump de versão → `0.0.3`

---

## Restrições

| Restrição                                          | Valor                      |
| -------------------------------------------------- | -------------------------- |
| Sem chamadas de IA externas (OpenAI, Gemini, etc.) | Ollama local apenas        |
| Timeout do Ollama                                  | 60s                        |
| Concorrência da fila                               | 1 análise por vez          |
| Sem `axios` ou `node-fetch`                        | `fetch` nativo do Obsidian |
| `CadenceAnalyzer` sem imports externos             | Funções puras TypeScript   |

---

## Referências

- [`_docs/ARQUITETURA.md`](../_docs/ARQUITETURA.md) — Seções 3.2, 4.2, 6.1–6.5
- [`_docs/personas/`](../_docs/personas/) — Personas de referência do produto
- [`.agent/skills/obsidian-plugin-standards/SKILL.md`](../.agent/skills/obsidian-plugin-standards/SKILL.md)
- [`.agent/skills/golden-rules/SKILL.md`](../.agent/skills/golden-rules/SKILL.md)
