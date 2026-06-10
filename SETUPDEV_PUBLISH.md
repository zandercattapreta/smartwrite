# SETUPDEV — Módulo Publish

**Plugin:** SmartWrite
**Módulo:** Publish (Módulo 3 de 3)
**Pré-requisito:** Módulo Write implementado (precisa de `types.ts` e `settings.ts`). Leia `_docs/ARQUITETURA.md` e `_docs/SUBSTACK_API.md` antes de começar.

---

## O que este módulo faz

O Módulo Publish converte uma nota Obsidian para o formato interno do Substack e a publica como draft ou post publicado. Faz upload automático de imagens locais para o CDN do Substack.

**Do ponto de vista do usuário:**
> Abre a nota que quer publicar. Roda o comando "Publicar no Substack". Confirma no modal. O plugin converte, faz upload das imagens, cria o draft e escreve a URL + data no frontmatter da nota.

---

## Arquivos a criar

```
src/modules/publish/
├── MarkdownConverter.ts   ← CRIAR — Markdown → ProseMirror JSON stringificado
├── SubstackClient.ts      ← CRIAR — HTTP client para a API do Substack
├── ImageUploader.ts       ← CRIAR — Lê imagens locais + POST /api/v1/image
├── FrontmatterWriter.ts   ← CRIAR — Escreve url + published_at na nota
├── PublicationLog.ts      ← CRIAR — Log append-only de publicações
└── PublishModal.ts        ← CRIAR — Modal de confirmação antes de publicar
```

---

## Contratos de cada arquivo

### `src/modules/publish/MarkdownConverter.ts`

> [!IMPORTANT]
> O Substack **não aceita HTML**. O `draft_body` deve ser um **ProseMirror JSON stringificado** — resultado de `JSON.stringify(proseMirrorDoc)`.
> Validado via HAR real capturado em `casadozander.substack.com`.

```typescript
// Entrada: conteúdo Markdown puro da nota (string)
// Saída: string (JSON.stringify de um ProseMirror doc)

interface ProseMirrorDoc {
  type: "doc";
  content: ProseMirrorNode[];
}

toProseMirror(markdown: string): string  // retorna JSON.stringify(doc)
```

**Mapeamento obrigatório (Markdown → Nó ProseMirror):**

| Markdown | type | attrs |
|---|---|---|
| `# H1` | `heading` | `{ level: 1, textAlign: null }` |
| `## H2` | `heading` | `{ level: 2, textAlign: null }` |
| Parágrafo | `paragraph` | `{ textAlign: null }` |
| `**bold**` | mark `strong` | — |
| `*italic*` | mark `em` | — |
| `[link](url)` | mark `link` | `{ href, target: "_blank" }` |
| `` `code` `` | mark `code` | — |
| `---` | `horizontal_rule` | — |
| `- item` | `bullet_list` → `list_item` → `paragraph` | — |
| `1. item` | `ordered_list` → `list_item` → `paragraph` | — |
| `![alt](src)` | `image` | `{ src, alt, title: null }` |

**Documento vazio (observado no HAR real):**
```json
{"type":"doc","content":[{"type":"paragraph","attrs":{"textAlign":null}}]}
```

> **Regra:** Função pura. Sem `import` de `obsidian`. Testável com `vitest` sem nenhum mock.

---

### `src/modules/publish/SubstackClient.ts`
HTTP client limpo. Toda a lógica de API do Substack passa por aqui.

**URL base:** `https://<substackSubdomain>.substack.com` (vem das Settings)

```typescript
// Headers obrigatórios em TODOS os requests:
// Cookie: substack.sid=<cookie>   (ou connect.sid — mesmo valor)
// Content-Type: application/json
// Origin: https://<subdomain>.substack.com
// Referer: https://<subdomain>.substack.com/
// User-Agent: Mozilla/5.0 ... Chrome/120.0.0.0 ...

// Usa requestUrl() do Obsidian (não fetch nativo) — evita CORS

async getUserId(): Promise<number>
// GET /api/v1/user/self → response.id

async createDraft(payload: DraftPayload): Promise<number>
// POST /api/v1/drafts → response.id (draftId)

async publishDraft(draftId: number): Promise<string>
// POST /api/v1/drafts/{draftId}/publish { send: true }
// Retorna URL: https://<subdomain>.substack.com/p/<draftId>

async uploadImage(dataUri: string): Promise<string>
// POST /api/v1/image { image: "data:image/png;base64,..." }
// Retorna URL CDN: https://substack-post-media.s3.amazonaws.com/...
```

**Payload de criação de draft (validado via HAR):**
```json
{
  "draft_title": "Título",
  "draft_subtitle": "",
  "draft_body": "{...ProseMirror JSON stringificado...}",
  "draft_bylines": [{ "id": <userId>, "is_guest": false }],
  "audience": "only_paid",
  "type": "newsletter",
  "draft_podcast_url": null,
  "draft_podcast_duration": null,
  "section_chosen": false,
  "draft_section_id": null
}
```

> [!WARNING]
> `draft_body` é uma **string** (JSON stringificado), não um objeto.
> `draft_bylines` usa `{ id: N, is_guest: false }` — não `{ user_id: N }`.
> Sem `?publication_id=XXX` na URL — o contexto vem do subdomínio.

**Tratamento de erros obrigatório:**
- `401` → `Notice("Cookie expirado. Atualize o substack.sid nas Settings.")`
- `403` → `Notice("Sem permissão. Verifique se o cookie pertence a esta publicação.")`
- Timeout (>30s) → `Notice("Substack não respondeu. Tente novamente.")`

---

### `src/modules/publish/ImageUploader.ts`

```typescript
// 1. Recebe o ProseMirror doc (como objeto, antes de stringify)
// 2. Percorre todos os nós type: "image"
// 3. Para cada src que começa com "![[" ou é path local:
//    a. Lê o arquivo via app.vault.readBinary(file)
//    b. Converte para base64
//    c. Monta data URI: "data:<mimeType>;base64,<data>"
//    d. POST /api/v1/image via SubstackClient.uploadImage()
//    e. Substitui src pelo URL CDN retornado
// 4. Retorna o doc com todos os srcs substituídos

async processImages(doc: ProseMirrorDoc, app: App): Promise<ProseMirrorDoc>
```

**MIME types suportados:** `image/png`, `image/jpeg`, `image/gif`, `image/webp`

**Regex para detectar imagem local no Markdown Obsidian:**
```typescript
// Wikilink: ![[nome-da-imagem.png]]
// Markdown: ![alt](./caminho/imagem.png)
// Ambos devem ser resolvidos via app.metadataCache.getFirstLinkpathDest()
```

---

### `src/modules/publish/FrontmatterWriter.ts`

```typescript
// Após publicação bem-sucedida, adiciona ao frontmatter da nota:
//   substack_url: https://casadozander.substack.com/p/12345
//   published_at: 2026-06-09T23:44:28.098Z

// Usa app.fileManager.processFrontMatter() — API nativa do Obsidian
// Nunca sobrescreve campos existentes além dos dois acima

async write(file: TFile, url: string, publishedAt: string, app: App): Promise<void>
```

---

### `src/modules/publish/PublicationLog.ts`

```typescript
// Arquivo de log: vault-root/smartwrite-log.json (path configurável nas Settings)
// Formato append-only — nunca reescreve entradas existentes
// Cada entrada: PublicationEntry (ver types.ts)

async append(entry: PublicationEntry, app: App): Promise<void>
async readAll(app: App): Promise<PublicationEntry[]>
```

---

### `src/modules/publish/PublishModal.ts`
`Modal` de confirmação antes de publicar.

```typescript
// Exibe:
//   - Título da nota
//   - Modo: [ ] Draft  [ ] Publicar agora
//   - Audiência: [ ] Todos  [ ] Pagantes  [ ] Gratuitos
//   - Aviso se nota já foi publicada (tem substack_url no frontmatter)
//   - Botões: "Publicar" | "Cancelar"
// Retorna: { confirmed: boolean, mode: "draft"|"publish", audience: string }
```

---

### Expansão do `main.ts`

Adicionar no `onload()`:
```typescript
// 1. Instanciar SubstackClient com settings
// 2. Instanciar MarkdownConverter, ImageUploader, FrontmatterWriter, PublicationLog
// 3. Registrar comando "SmartWrite: Publicar no Substack"
//    → abre PublishModal
//    → se confirmado: executa fluxo completo
// 4. Registrar listener smartwrite:publish-complete → FrontmatterWriter + PublicationLog
```

---

## Fluxo de dados completo

```
Comando "Publicar no Substack"
      ↓
PublishModal.open()                  → usuário escolhe modo + audiência
      ↓
[confirmado]
MarkdownConverter.toProseMirror()    → ProseMirror doc (objeto)
      ↓
ImageUploader.processImages(doc)     → POST /api/v1/image por imagem local
                                       substitui src local por URL CDN
      ↓
JSON.stringify(doc)                  → draft_body (string)
      ↓
SubstackClient.createDraft(payload)  → POST /api/v1/drafts
                                       retorna draftId
      ↓
[se modo = "publish"]
SubstackClient.publishDraft(draftId) → POST /api/v1/drafts/{id}/publish
      ↓
app.workspace.trigger('smartwrite:publish-complete', { url, date })
      ↓
FrontmatterWriter.write(file, url, date)
      ↓
PublicationLog.append(entry)
      ↓
Notice("✅ Publicado: <url>")
```

---

## Testes obrigatórios

Criar em `tests/publish/`:

```typescript
// MarkdownConverter.test.ts
describe("toProseMirror", () => {
  it("converte parágrafo simples")
  it("converte heading H1 e H2")
  it("converte bold e italic inline")
  it("converte lista não-ordenada")
  it("converte lista ordenada")
  it("converte link com href")
  it("converte separador ---")
  it("retorna JSON válido (JSON.parse não lança)")
  it("draft_body é string, não objeto")
  it("documento vazio retorna parágrafo vazio com textAlign: null")
})
```

> `SubstackClient`, `ImageUploader`, `FrontmatterWriter` e `PublishModal` são testados manualmente no vault de testes com cookie real.

---

## Setup manual para testes de integração

```bash
# 1. Pegar o cookie do Chrome
# DevTools → Application → Cookies → casadozander.substack.com → connect.sid

# 2. Configurar nas Settings do plugin
#    Substack Cookie: <valor do connect.sid>
#    Substack Subdomain: casadozander
#    User ID: 466115474  (do GET /api/v1/user/self)

# 3. Abrir uma nota no vault local (`_ smartwrite`)
# 4. Rodar comando "SmartWrite: Publicar no Substack" em modo Draft
# 5. Verificar no Substack se o draft aparece
```

---

## Definição de pronto (DoD)

- [ ] `npm run lint` → 0 erros
- [ ] `npm run build` → build sem erros
- [ ] `npm test` → todos os testes de `MarkdownConverter` passando
- [ ] `npm run deploy` → plugin carregado no vault local (`_ smartwrite`)
- [ ] Draft criado com sucesso no Substack (verificar em casadozander.substack.com/publish)
- [ ] Frontmatter da nota tem `substack_url` e `published_at` após publicação
- [ ] `smartwrite-log.json` tem a entrada da publicação
- [ ] Imagem local uploadada e substituída pela URL CDN no draft
- [ ] Modal exibe alerta quando nota já foi publicada anteriormente
- [ ] Bump de versão → `0.1.0` + push para GitHub

---

## Restrições

| Restrição | Valor |
|---|---|
| `MarkdownConverter` sem imports de `obsidian` | Função pura TypeScript |
| Cookie armazenado em `data.json` | Campo mascarado como `password` no SettingTab |
| Aviso no SettingTab | "Não sincronize data.json via Git/iCloud" |
| Timeout das requisições | 30s |
| Sem `scheduled` mode | API do Substack não expõe este endpoint |

---

## API do Substack — Referência rápida

> Documento completo: [`_docs/SUBSTACK_API.md`](../_docs/SUBSTACK_API.md) — v2.0 validado via HAR real

| Endpoint | Método | Propósito |
|---|---|---|
| `/api/v1/user/self` | GET | Obtém `userId` para `draft_bylines` |
| `/api/v1/drafts` | POST | Cria draft (retorna `id`) |
| `/api/v1/drafts/{id}/publish` | POST | Publica draft `{ send: true }` |
| `/api/v1/image` | POST | Upload de imagem `{ image: "data:...;base64,..." }` |

**Dados reais da publicação de testes:**
- `userId`: `466115474`
- `substackSubdomain`: `casadozander`
- `publicationId`: `1203923` (não necessário nos requests)

---

## Referências

- [`_docs/SUBSTACK_API.md`](../_docs/SUBSTACK_API.md) — Contrato completo da API (v2.0)
- [`_docs/ARQUITETURA.md`](../_docs/ARQUITETURA.md) — Seções 3.3, 4.3, 6.1–6.5
- [`.agent/skills/obsidian-plugin-standards/SKILL.md`](../.agent/skills/obsidian-plugin-standards/SKILL.md)
- [`.agent/skills/golden-rules/SKILL.md`](../.agent/skills/golden-rules/SKILL.md)
- [`.agent/skills/smartwrite-versioning/SKILL.md`](../.agent/skills/smartwrite-versioning/SKILL.md)
