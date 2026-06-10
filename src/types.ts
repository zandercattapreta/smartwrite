// ==============================================================================
// SCRIPT: types.ts
// DESCRIÇÃO: Interfaces e tipos compartilhados dos módulos Write, Feedback e Publish
// CHAMADO POR: Todos os módulos — importado via import type
// TRAZ (CHAMA/IMPORTA): Nada (arquivo de tipos puro)
// CONTRATO (RESPOSTA ESPERADA): Exporta todas as interfaces do projeto SmartWrite
// ==============================================================================

// ---------------------------------------------------------------------------
// Configurações persistidas em data.json via this.loadData() / this.saveData()
// ---------------------------------------------------------------------------

/** Configurações completas do plugin SmartWrite (todos os módulos) */
export interface SmartWriteSettings {
	// --- Write ---
	/** Habilita realce de frases longas no editor */
	highlightLongSentences: boolean;
	/** Número de palavras acima do qual a frase é marcada como longa */
	longSentenceThreshold: number;
	/** Habilita realce de palavras frequentes repetidas */
	highlightFrequentWords: boolean;
	/** Lado do painel Write: 'left' ou 'right' */
	writeViewSide: "left" | "right";
	/** Meta de palavras por dia */
	dailyWordGoal: number;

	// --- Feedback ---
	/** URL base do Ollama local */
	ollamaEndpoint: string;
	/** Modelo Ollama a usar (ex: "qwen2.5") */
	ollamaModel: string;
	/** Persona ativa no momento (id) */
	activePersona: string;
	/** Caminho no vault para pasta de personas customizadas (vazio = usa bundled) */
	personasVaultPath: string;
	/** Intervalo entre análises automáticas em ms (0 = desabilitado) */
	analysisIntervalMs: number;
	/** Lado do painel Feedback: 'left' ou 'right' */
	feedbackViewSide: "left" | "right";

	// --- Publish ---
	/**
	 * Cookie de autenticação do Substack (substack.sid ou connect.sid).
	 * AVISO: Nunca logar este valor. Campo mascarado como password no SettingTab.
	 */
	substackCookie: string;
	/** Subdomínio do Substack do usuário (ex: "casadozander") */
	substackSubdomain: string;
	/** ID numérico do usuário no Substack (de GET /api/v1/user/self) */
	substackUserId: number;
	/** Audiência padrão ao publicar */
	defaultAudience: "everyone" | "only_paid" | "only_free";
	/** Modo de publicação padrão */
	defaultPublishMode: "draft" | "publish";
}

// ---------------------------------------------------------------------------
// Estado em memória da sessão de escrita (não persistido em data.json)
// ---------------------------------------------------------------------------

/** Estado da sessão atual de escrita — vive apenas em memória */
export interface SessionStateData {
	/** Total de palavras escritas nesta sessão */
	sessionWordCount: number;
	/** Timestamp em que a sessão iniciou (Date.now()) */
	sessionStartTime: number;
	/** Caminho do último arquivo ativo (TFile.path) */
	lastActiveFile: string;
	/** Palavras por minuto calculado na sessão */
	wpm: number;
}

// ---------------------------------------------------------------------------
// Módulo Write — tipos de dados
// ---------------------------------------------------------------------------

/** Resultado de análise estatística de um texto */
export interface StatsResult {
	/** Contagem total de palavras */
	wordCount: number;
	/** Contagem total de caracteres (sem espaços) */
	charCount: number;
	/** Tempo estimado de leitura em minutos (base: 200wpm) */
	readingTimeMin: number;
	/** Palavras por minuto na sessão atual */
	wpm: number;
	/** Lista de ranges de frases longas */
	longSentences: HighlightSpan[];
	/** Lista de ranges de palavras repetidas */
	repeatedWords: HighlightSpan[];
}

/** Span de posição para highlight no editor (baseado em offsets de string) */
export interface HighlightSpan {
	/** Offset de início (inclusivo) */
	from: number;
	/** Offset de fim (exclusivo) */
	to: number;
	/** Tipo do highlight para classe CSS */
	type: "long-sentence" | "repeated-word" | "passive-voice";
}

/** Estado da view Write (para sincronização entre componentes) */
export interface WriteViewState {
	/** Stats atuais do documento */
	stats: StatsResult | null;
	/** Número de problemas encontrados no último scan */
	problemCount: number;
	/** Timestamp da última atualização */
	lastUpdated: number;
}

// ---------------------------------------------------------------------------
// Módulo Feedback — tipos de dados
// ---------------------------------------------------------------------------

/** Um item de feedback retornado pelo Ollama para uma persona */
export interface FeedbackItem {
	/** Trecho exato do texto problemático */
	excerpt: string;
	/** Descrição do problema identificado */
	issue: string;
	/** Gravidade do problema */
	severity: "low" | "medium" | "high";
}

/** Resultado completo de uma análise por persona */
export interface FeedbackResult {
	/** ID da persona que gerou este resultado */
	personaId: string;
	/** Trecho exato do texto problemático */
	excerpt: string;
	/** Descrição do problema */
	issue: string;
	/** Gravidade do problema */
	severity: "low" | "medium" | "high";
	/** Timestamp da análise */
	timestamp: number;
}

/** Definição de uma persona (bundled ou do vault) */
export interface PersonaDefinition {
	/** ID único da persona (ex: "common-reader") */
	id: string;
	/** Nome legível da persona */
	nome: string;
	/** System prompt completo para enviar ao Ollama */
	systemPrompt: string;
	/** Origem da persona */
	source: "bundled" | "vault";
}

// ---------------------------------------------------------------------------
// Módulo Publish — tipos de dados
// ---------------------------------------------------------------------------

/** Entrada do log de publicações (append-only) */
export interface PublicationEntry {
	/** Caminho do arquivo no vault */
	filePath: string;
	/** URL do post no Substack */
	substackUrl: string;
	/** Data de publicação em ISO 8601 */
	publishedAt: string;
	/** Modo utilizado na publicação */
	mode: "draft" | "scheduled" | "publish";
}

/** Opções para criação de um draft no Substack */
export interface PublishDraftOptions {
	/** Título do post */
	title: string;
	/** Subtítulo opcional */
	subtitle: string;
	/** Conteúdo em ProseMirror JSON stringificado */
	draftBody: string;
	/** ID do usuário para draft_bylines */
	userId: number;
	/** Audiência do post */
	audience: "everyone" | "only_paid" | "only_free";
	/** Modo de publicação */
	mode: "draft" | "publish";
}

/** Nó de um documento ProseMirror (formato interno do Substack) */
export interface ProseMirrorNode {
	type: string;
	attrs?: Record<string, unknown>;
	content?: ProseMirrorNode[];
	marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
	text?: string;
}

/** Documento ProseMirror completo */
export interface ProseMirrorDoc {
	type: "doc";
	content: ProseMirrorNode[];
}

/** Payload enviado ao endpoint POST /api/v1/drafts do Substack */
export interface DraftPayload {
	draft_title: string;
	draft_subtitle: string;
	draft_body: string;
	draft_bylines: Array<{ id: number; is_guest: boolean }>;
	audience: string;
	type: "newsletter";
	draft_podcast_url: null;
	draft_podcast_duration: null;
	section_chosen: boolean;
	draft_section_id: null;
}

/** Request para o endpoint /api/generate do Ollama */
export interface OllamaRequest {
	model: string;
	prompt: string;
	system: string;
	stream: boolean;
}
