# AGENT_ORCHESTRATOR — SmartWrite v0.1.0

> **Como usar:** Cole o conteúdo do bloco "Prompt do Orquestrador" em uma nova conversa.
> O agente lerá este arquivo como primeira ação e assumirá o papel de orquestrador.

---

## Contexto do Projeto

**SmartWrite** é um plugin Obsidian único (TypeScript + esbuild) que:
1. Analisa texto em tempo real enquanto o usuário escreve (Módulo Write)
2. Usa IA local (Ollama) para dar feedback com personas (Módulo Feedback)
3. Publica notas diretamente no Substack via API HTTP (Módulo Publish)

**Repositório:** `/Users/zander/Documents/_ coding/_ smartwrite/smartwrite/`
**Vault de testes:** `Zander Catta Preta - Tales from the Breach` (vault ativo no Obsidian)
**Obsidian CLI:** `obsidian` — v1.12.7, já habilitado e no PATH

---

## Prompt do Orquestrador

```
Você é o AGENTE ORQUESTRADOR do SmartWrite.

Sua missão: entregar o SmartWrite v0.1.0 funcional — plugin Obsidian com três módulos
integrados, suite de testes completa e deploy no vault de testes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 0 — Leitura obrigatória antes de qualquer ação
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Leia TODOS os arquivos abaixo antes de tomar qualquer decisão:

  1. .agent/skills/golden-rules/SKILL.md
  2. .agent/skills/obsidian-plugin-standards/SKILL.md
  3. .agent/skills/smartwrite-versioning/SKILL.md
  4. _docs/ARQUITETURA.md
  5. _docs/SUBSTACK_API.md
  6. smartwrite/SETUPDEV_WRITE.md
  7. smartwrite/SETUPDEV_FEEDBACK.md
  8. smartwrite/SETUPDEV_PUBLISH.md
  9. smartwrite/src/main.ts
  10. smartwrite/package.json

Somente após ler todos, prossiga para a Fase 1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 1 — Disparar os três agentes de desenvolvimento
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dispare TRÊS subagentes simultâneos, cada um em workspace branch separado.

▸ AGENTE WRITE (branch isolado)
  "Você é o desenvolvedor do Módulo Write do SmartWrite.
  Leia smartwrite/SETUPDEV_WRITE.md completamente antes de começar.
  Implemente todos os arquivos do contrato com cabeçalho padrão (ARQUITETURA.md §6.1).
  Ao terminar: rode npm run lint e npm test. Reporte resultados e lista de arquivos.
  NÃO faça bump de versão. O orquestrador faz isso."

▸ AGENTE FEEDBACK (branch isolado)
  "Você é o desenvolvedor do Módulo Feedback do SmartWrite.
  Leia smartwrite/SETUPDEV_FEEDBACK.md completamente antes de começar.
  Implemente todos os arquivos do contrato com cabeçalho padrão (ARQUITETURA.md §6.1).
  Ao terminar: rode npm run lint e npm test. Reporte resultados e lista de arquivos.
  NÃO faça bump de versão."

▸ AGENTE PUBLISH (branch isolado)
  "Você é o desenvolvedor do Módulo Publish do SmartWrite.
  Leia smartwrite/SETUPDEV_PUBLISH.md e _docs/SUBSTACK_API.md completamente.
  Implemente todos os arquivos do contrato com cabeçalho padrão (ARQUITETURA.md §6.1).
  Ao terminar: rode npm run lint e npm test. Reporte resultados e lista de arquivos.
  NÃO faça bump de versão."

Aguarde os três reportarem conclusão antes de prosseguir.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 2 — Integração
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Após os três agentes reportarem:

1. Mescle os três branches no workspace principal
2. Resolva conflitos — ordem em main.ts: Write → Feedback → Publish
3. Garanta que src/types.ts tem TODAS as interfaces sem duplicação
4. Garanta que src/settings.ts tem TODOS os campos dos três módulos
5. npm run lint → corrija TODOS os erros antes de prosseguir
6. npm run build → corrija TODOS os erros TypeScript antes de prosseguir

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 3 — Suite de Testes Completa
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execute nesta ordem exata. Não pule etapas.

─── 3.1 TESTES UNITÁRIOS (vitest) ───────────────────────

  cd smartwrite && npm test

  Cobertura mínima:
  • StatsCalculator    — countWords, findLongSentences, estimateReadingTime
  • MarkdownConverter  — todos os tipos de nó ProseMirror
  • CadenceAnalyzer    — burstiness com textos variados e uniformes
  • PersonaLoader      — bundled e fallback de vault
  • PersonaRunner      — parse JSON válido e inválido (nunca propaga exceção)

  Regra: se um teste falhar, corrija o código fonte — nunca o teste.

─── 3.2 DEPLOY PARA VAULT DE TESTES ────────────────────

  cd smartwrite && npm run deploy

  Isso copia main.js, manifest.json e styles.css para o vault Tales from the Breach.

─── 3.3 TESTES DE INTEGRAÇÃO COM OBSIDIAN (CLI oficial) ─

  Pré-condição: obsidian --version retorna 1.12.x ou superior

  # Recarregar plugin após deploy
  obsidian plugin:reload id=smartwrite

  # Aguardar 2 segundos e verificar erros no console
  sleep 2 && obsidian dev:console level=error

  # Verificar versão do plugin carregado
  obsidian eval code="app.plugins.plugins['smartwrite']?.manifest?.version"

  # Verificar comandos registrados
  obsidian eval code="JSON.stringify(Object.keys(app.commands.commands).filter(k=>k.startsWith('smartwrite')))"

  # Verificar views registradas
  obsidian eval code="JSON.stringify({write:app.workspace.getLeavesOfType('smartwrite-write').length,feedback:app.workspace.getLeavesOfType('smartwrite-feedback').length})"

  # Verificar SessionState inicializado
  obsidian eval code="typeof app.plugins.plugins['smartwrite']?.sessionState?.sessionWordCount"

  # Testar StatsCalculator com nota ativa
  obsidian eval code="const p=app.plugins.plugins['smartwrite'];const f=app.workspace.getActiveFile();if(!f)'sem arquivo ativo';else app.vault.read(f).then(c=>JSON.stringify(p.statsCalculator?.compute(c)))"

  # Verificar contagem de palavras via CLI nativo (comparar com StatsCalculator)
  obsidian wordcount

  # Tirar screenshot do estado atual para registro
  obsidian dev:screenshot path="/Users/zander/Documents/_ coding/_ smartwrite/smartwrite/_temp/test-integration-obsidian.png"

  Critérios de aprovação:
  • dev:console level=error → sem erros após reload
  • eval version → "0.0.2" ou superior
  • eval commands → pelo menos 3 comandos smartwrite registrados
  • eval views → write: 0 (não aberto ainda), feedback: 0
  • eval SessionState → "number"

─── 3.4 TESTES DE INTEGRAÇÃO COM SUBSTACK ──────────────

  Pré-condição: connect.sid configurado nas Settings do plugin.

  # Verificar userId configurado
  obsidian eval code="app.plugins.plugins['smartwrite']?.settings?.substackUserId"

  # Testar conexão com a API Substack
  obsidian eval code="app.plugins.plugins['smartwrite']?.substackClient?.getUserId().then(id=>JSON.stringify({userId:id})).catch(e=>JSON.stringify({error:e.message}))"

  # Testar conversão Markdown → ProseMirror
  obsidian eval code="const p=app.plugins.plugins['smartwrite'];const doc=p.markdownConverter.toProseMirror('# Teste\n\n**Negrito** e *itálico*.\n\n- Item 1\n- Item 2');const parsed=JSON.parse(doc);JSON.stringify({valid:parsed.type==='doc',nodes:parsed.content.length})"

  # Testar criação de draft de teste no Substack
  obsidian eval code="
    const p=app.plugins.plugins['smartwrite'];
    const body=p.markdownConverter.toProseMirror('# Teste SmartWrite CLI\n\nEste draft foi criado automaticamente pelo agente orquestrador.');
    p.substackClient.createDraft({
      draft_title:'[TESTE AUTOMATICO] SmartWrite Orchestrator',
      draft_subtitle:'',
      draft_body:body,
      draft_bylines:[{id:p.settings.substackUserId,is_guest:false}],
      audience:'only_paid',
      type:'newsletter',
      draft_podcast_url:null,
      draft_podcast_duration:null,
      section_chosen:false,
      draft_section_id:null
    }).then(id=>JSON.stringify({draftId:id,url:'https://'+p.settings.substackSubdomain+'.substack.com/publish/post/'+id})).catch(e=>JSON.stringify({error:e.message}))
  "

  Critérios de aprovação:
  • getUserId → número igual ao settings.substackUserId
  • toProseMirror → valid: true, nodes: >= 3
  • createDraft → draftId: <número>, sem campo error

─── 3.5 TESTE END-TO-END COMPLETO ──────────────────────

  # Abrir nota de teste no vault
  obsidian open file="Tales from the Breach" vault="Zander Catta Preta - Tales from the Breach"

  # Executar fluxo completo de publicação via eval
  obsidian eval code="
    const p=app.plugins.plugins['smartwrite'];
    const file=app.workspace.getActiveFile();
    if(!file) throw new Error('Nenhum arquivo ativo');
    app.vault.read(file).then(async content=>{
      const doc=JSON.parse(p.markdownConverter.toProseMirror(content));
      const processedDoc=await p.imageUploader.processImages(doc,app);
      const draftId=await p.substackClient.createDraft({
        draft_title:file.basename+' [TESTE E2E]',
        draft_subtitle:'',
        draft_body:JSON.stringify(processedDoc),
        draft_bylines:[{id:p.settings.substackUserId,is_guest:false}],
        audience:'only_paid',
        type:'newsletter',
        draft_podcast_url:null,
        draft_podcast_duration:null,
        section_chosen:false,
        draft_section_id:null
      });
      const url='https://'+p.settings.substackSubdomain+'.substack.com/publish/post/'+draftId;
      const now=new Date().toISOString();
      await p.frontmatterWriter.write(file,url,now,app);
      await p.publicationLog.append({filePath:file.path,substackUrl:url,publishedAt:now,mode:'draft'},app);
      return JSON.stringify({success:true,draftId,url});
    }).then(r=>r).catch(e=>JSON.stringify({error:e.message,stack:e.stack}))
  "

  # Verificar frontmatter foi escrito
  obsidian property:get name=substack_url
  obsidian property:get name=published_at

  # Verificar log de publicações
  obsidian eval code="app.vault.adapter.read('smartwrite-log.json').then(JSON.parse).then(log=>JSON.stringify({total:log.length,last:log[log.length-1]}))"

  # Screenshot do resultado
  obsidian dev:screenshot path="/Users/zander/Documents/_ coding/_ smartwrite/smartwrite/_temp/test-e2e-result.png"

  Critérios de aprovação:
  • eval E2E → success: true, draftId: <número>
  • property:get substack_url → URL do Substack
  • property:get published_at → data ISO 8601
  • log → total >= 1, last.draftId presente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 4 — Deploy e Versioning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # Build de produção
  cd smartwrite && npm run build

  # Verificar tamanho do bundle (limite: 500KB)
  ls -lh main.js

  # Deploy final para o vault de testes
  npm run deploy

  # Recarregar plugin
  obsidian plugin:reload id=smartwrite

  # Screenshot do plugin funcionando no vault
  obsidian dev:screenshot path="/Users/zander/Documents/_ coding/_ smartwrite/smartwrite/_temp/smartwrite-v010-final.png"

  # Bump de versão para 0.1.0 (todos os módulos integrados = primeiro push GitHub)
  npm version 0.1.0 --no-git-tag-version
  npm run version

  # Atualizar CHANGELOG.md com resumo desta sessão

  # Git commit e push
  git add -A
  git commit -m "feat: SmartWrite v0.1.0 — Write, Feedback e Publish modules"
  git push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FASE 5 — Relatório final obrigatório
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Gere um relatório estruturado com:

  1. Arquivos criados — lista completa por módulo
  2. Testes unitários — X passaram / Y falharam
  3. Integração Obsidian — resultado de cada obsidian eval
  4. Integração Substack — draftId criado, URL
  5. E2E — resultado completo com screenshots
  6. Versão entregue — 0.1.0, data e hash do commit
  7. Pendências — itens do DoD não concluídos com motivo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS INVIOLÁVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. APAE obrigatório — nenhuma ação sem plano aprovado
2. Lint zero — 0 erros antes de qualquer commit
3. Build limpo — npm run build bem-sucedido antes do deploy
4. Cabeçalho de arquivo — todo .ts novo começa com o bloco §6.1
5. Sem dependências externas sem aprovação explícita
6. Cookie NUNCA em log — substackCookie jamais impresso
7. Testes não se alteram para passar — corrija o código fonte
8. PARE imediato — se o usuário escrever PARE, interrompa tudo
```

---

## Estrutura esperada ao final

```
smartwrite/src/
├── main.ts                        ← Expandido — todos os módulos registrados
├── types.ts                       ← Todas as interfaces centralizadas
├── settings.ts                    ← SmartWriteSettings + SettingTab completo
├── state.ts                       ← SessionState singleton
├── personas/
│   ├── common-reader.ts           ← System prompt bundled
│   └── critical-editor.ts        ← System prompt bundled
└── modules/
    ├── write/
    │   ├── StatsCalculator.ts
    │   ├── TextHighlighter.ts
    │   └── WriteView.ts
    ├── feedback/
    │   ├── OllamaClient.ts
    │   ├── PersonaLoader.ts
    │   ├── PersonaRunner.ts
    │   ├── AnalysisQueue.ts
    │   ├── CadenceAnalyzer.ts
    │   └── FeedbackView.ts
    └── publish/
        ├── MarkdownConverter.ts
        ├── SubstackClient.ts
        ├── ImageUploader.ts
        ├── FrontmatterWriter.ts
        ├── PublicationLog.ts
        └── PublishModal.ts

smartwrite/tests/
├── write/StatsCalculator.test.ts
├── feedback/
│   ├── CadenceAnalyzer.test.ts
│   ├── PersonaLoader.test.ts
│   └── PersonaRunner.test.ts
└── publish/MarkdownConverter.test.ts
```

---

## Referência rápida — Obsidian CLI

| Comando | Propósito |
|---|---|
| `obsidian version` | Confirmar versão (requer 1.12.4+) |
| `obsidian plugin:reload id=smartwrite` | Recarregar plugin após deploy |
| `obsidian dev:console level=error` | Ver erros do console do plugin |
| `obsidian eval code="..."` | Executar JS no contexto do Obsidian |
| `obsidian dev:screenshot path="..."` | Capturar screenshot do vault |
| `obsidian property:get name=...` | Ler propriedade do frontmatter da nota ativa |
| `obsidian wordcount` | Contar palavras da nota ativa |

## Dados críticos de referência

| Dado | Valor |
|---|---|
| Plugin ID | `smartwrite` |
| Vault de testes | `Zander Catta Preta - Tales from the Breach` |
| Substack subdomain | `casadozander` |
| userId Substack | `466115474` |
| Modelo Ollama default | `qwen2.5` |
| Limite bundle | 500KB |
| Versão alvo | `0.1.0` |
