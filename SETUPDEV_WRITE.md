# SETUPDEV — Módulo Write

**Plugin:** SmartWrite
**Módulo:** Write (Módulo 1 de 3)
**Pré-requisito:** Leia `_docs/ARQUITETURA.md` antes de começar.

---

## O que este módulo faz

O Módulo Write acompanha a sessão de escrita em tempo real — sem IA, sem rede, sem async. Pura leitura do texto aberto no editor.

**Do ponto de vista do usuário:**
> Enquanto escreve, vê em tempo real: palavras escritas hoje, WPM, tempo de leitura estimado. No editor, frases longas, palavras repetidas e voz passiva ficam sutilmente destacadas. Uma bolinha no ribbon acende quando há problemas para revisar.

---

## Arquivos a criar

```
src/
├── state.ts                        ← CRIAR — SessionState singleton
├── settings.ts                     ← CRIAR — SmartWriteSettings + SettingTab
├── types.ts                        ← CRIAR — Todas as interfaces do projeto
└── modules/
    └── write/
        ├── StatsCalculator.ts      ← CRIAR — Funções puras de estatísticas
        ├── TextHighlighter.ts      ← CRIAR — CodeMirror 6 Extension
        └── WriteView.ts            ← CRIAR — ItemView do painel lateral
```

`main.ts` também precisa ser expandido para registrar comandos, ribbon e listeners.

---

## Contratos de cada arquivo

### `src/types.ts`
Exporta todas as interfaces do projeto. Começa com:

```typescript
interface SmartWriteSettings {
  ollamaUrl: string;           // default: "http://localhost:11434"
  ollamaModel: string;         // default: "qwen2.5"
  activePersona: string;       // default: "common-reader"
  personasVaultPath: string;   // default: ""
  dailyWordGoal: number;       // default: 500
  longSentenceThreshold: number; // default: 40
  substackCookie: string;      // default: ""
  substackUserId: number;      // default: 0
  substackSubdomain: string;   // default: ""
  defaultAudience: "everyone" | "only_paid" | "only_free"; // default: "only_paid"
  defaultPublishMode: "draft" | "publish"; // default: "draft"
}

interface SessionState {
  sessionWordCount: number;
  sessionStartTime: number;   // Date.now()
  lastActiveFile: string;     // TFile.path
  wpm: number;
}

interface FeedbackResult {
  personaId: string;
  excerpt: string;
  issue: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
}

interface PublicationEntry {
  filePath: string;
  substackUrl: string;
  publishedAt: string;         // ISO 8601
  mode: "draft" | "publish";
}

interface Persona {
  id: string;
  nome: string;
  systemPrompt: string;
  source: "bundled" | "vault";
}
```

---

### `src/state.ts`
Singleton em memória. Não persiste em `data.json`.

```typescript
// Criado no onload(), destruído no onunload()
// Resetado quando o arquivo ativo muda (evento file-open)
export class SessionState {
  sessionWordCount: number = 0;
  sessionStartTime: number = Date.now();
  lastActiveFile: string = "";
  wpm: number = 0;

  reset(): void { /* zera tudo, preserva startTime */ }
}
```

---

### `src/modules/write/StatsCalculator.ts`
**Funções puras — sem side effects, sem API do Obsidian.**
Testável com `vitest` sem nenhum mock.

```typescript
// Entradas: texto puro (string)
// Saídas: objeto com métricas

countWords(text: string): number
countChars(text: string): number
estimateReadingTime(wordCount: number): number   // minutos, 200wpm
calculateWPM(wordCount: number, elapsedMs: number): number
findLongSentences(text: string, threshold: number): Range[]
findRepeatedWords(text: string): Range[]
findPassiveVoice(text: string): Range[]
```

> **Regra:** Nenhum `import` de `obsidian`. Só TypeScript puro.

---

### `src/modules/write/TextHighlighter.ts`
CodeMirror 6 Extension. Registrado via `this.registerEditorExtension()` no `main.ts`.

```typescript
// Nunca manipula o DOM diretamente
// Usa StateField + Decoration da API do CodeMirror
// Recebe os ranges de StatsCalculator e aplica classes CSS

export function buildHighlightExtension(settings: SmartWriteSettings): Extension
```

Classes CSS a definir em `styles.css`:
- `.sw-long-sentence` — fundo sutil amarelo/âmbar
- `.sw-repeated-word` — sublinhado pontilhado
- `.sw-passive-voice` — fundo sutil azul

---

### `src/modules/write/WriteView.ts`
`ItemView` do painel lateral (não `Modal`).

```typescript
// VIEW_TYPE = "smartwrite-write"
// Exibe: palavras da sessão, WPM, tempo de leitura, meta diária (progresso)
// Atualiza ao receber evento: smartwrite:highlights-updated
// Usa containerEl da API — nunca document.querySelector()
```

---

### Expansão do `main.ts`

Adicionar no `onload()`:
```typescript
// 1. Instanciar Settings + carregar data.json
// 2. Instanciar SessionState
// 3. Registrar WriteView via this.registerView()
// 4. Registrar TextHighlighter via this.registerEditorExtension()
// 5. Registrar listener editor-change → StatsCalculator → estado
// 6. Registrar listener file-open → SessionState.reset()
// 7. Registrar ribbon icon
// 8. Registrar comando "SmartWrite: Abrir painel Write"
// 9. Adicionar SettingTab via this.addSettingTab()
```

---

## Fluxo de dados

```
Keystroke no editor
      ↓
editor-change (Obsidian)
      ↓
StatsCalculator.compute(text)   → atualiza SessionState
      ↓
TextHighlighter.update()        → CodeMirror Extension aplica decorações
      ↓
WriteView.refresh()             → painel lateral atualiza números
      ↓
[se problemas > 0]
app.workspace.trigger('smartwrite:highlights-updated', count)
```

---

## Testes obrigatórios

Criar em `tests/write/`:

```typescript
// StatsCalculator.test.ts
describe("countWords", () => {
  it("retorna 0 para string vazia")
  it("ignora múltiplos espaços")
  it("conta palavras com hífen como uma")
})

describe("findLongSentences", () => {
  it("detecta frases acima do threshold")
  it("ignora frases abaixo do threshold")
  it("retorna ranges corretos (from, to)")
})

describe("estimateReadingTime", () => {
  it("retorna 1 para textos < 200 palavras")
  it("retorna 5 para 1000 palavras")
})
```

> `WriteView` e `TextHighlighter` são testados manualmente no vault de testes.

---

## Definição de pronto (DoD)

- [ ] `npm run lint` → 0 erros
- [ ] `npm run build` → build sem erros
- [ ] `npm test` → todos os testes do `StatsCalculator` passando
- [ ] `npm run deploy` → plugin carregado no vault Tales from the Breach
- [ ] Painel Write abre via comando e via ribbon
- [ ] Stats atualizam em tempo real enquanto escreve
- [ ] Highlights aparecem no editor (frases longas, repetições)
- [ ] Sessão reseta ao trocar de arquivo
- [ ] Bump de versão: `0.0.1` → `0.0.2`

---

## Restrições

| Restrição | Valor |
|---|---|
| Tempo máximo de atualização por keystroke | ≤ 100ms |
| Nenhum `import` externo em `StatsCalculator.ts` | — |
| Sem manipulação direta de DOM | Usar `containerEl` |
| Sem chamadas de rede | Write é 100% offline |

---

## Referências

- [`_docs/ARQUITETURA.md`](../_docs/ARQUITETURA.md) — Seções 3.1, 3.4, 4.1, 6.1–6.5
- [`.agent/skills/obsidian-plugin-standards/SKILL.md`](../.agent/skills/obsidian-plugin-standards/SKILL.md)
- [`.agent/skills/golden-rules/SKILL.md`](../.agent/skills/golden-rules/SKILL.md)
- [`.agent/skills/smartwrite-versioning/SKILL.md`](../.agent/skills/smartwrite-versioning/SKILL.md)
