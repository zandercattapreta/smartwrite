// ==============================================================================
// SCRIPT: main.ts
// DESCRIÇÃO: Entry point do plugin SmartWrite. Registra comandos, ribbon e lifecycle.
// CHAMADO POR: Obsidian (ao carregar o plugin no vault)
// TRAZ (CHAMA/IMPORTA): obsidian (Plugin, Notice, TFile), settings.ts,
//   state.ts, Write/Feedback/Publish modules
// CONTRATO (RESPOSTA ESPERADA): Plugin inicializado com todos os módulos
//   registrados no workspace do Obsidian
// ==============================================================================

import { Notice, Plugin, TFile } from "obsidian";
import type { Events, WorkspaceLeaf } from "obsidian";

import { DEFAULT_SETTINGS, SmartWriteSettingTab } from "./settings";
import { sessionState } from "./state";
import type { SmartWriteSettings } from "./types";

// --- Write
import { StatsCalculator } from "./modules/write/StatsCalculator";
import { buildHighlightExtension } from "./modules/write/TextHighlighter";
import { WriteView, VIEW_TYPE_WRITE } from "./modules/write/WriteView";

// --- Feedback
import { OllamaClient } from "./modules/feedback/OllamaClient";
import { PersonaLoader } from "./modules/feedback/PersonaLoader";
import { PersonaRunner } from "./modules/feedback/PersonaRunner";
import { AnalysisQueue } from "./modules/feedback/AnalysisQueue";
import { FeedbackView, VIEW_TYPE_FEEDBACK } from "./modules/feedback/FeedbackView";

// --- Publish
import { MarkdownConverter } from "./modules/publish/MarkdownConverter";
import { SubstackClient } from "./modules/publish/SubstackClient";
import { ImageUploader } from "./modules/publish/ImageUploader";
import { FrontmatterWriter } from "./modules/publish/FrontmatterWriter";
import { PublicationLog } from "./modules/publish/PublicationLog";
import { PublishModal } from "./modules/publish/PublishModal";

// Evento interno de publicação completa
const EVENT_PUBLISH_COMPLETE = "smartwrite:publish-complete";

export default class SmartWrite extends Plugin {
	settings!: SmartWriteSettings;

	// --- Módulo Write
	private statsCalculator!: StatsCalculator;
	private writeViewRegistered = false;

	// --- Módulo Feedback
	private ollamaClient!: OllamaClient;
	private personaLoader!: PersonaLoader;
	private personaRunner!: PersonaRunner;
	private analysisQueue!: AnalysisQueue;

	// --- Módulo Publish
	private substackClient!: SubstackClient;
	private markdownConverter!: MarkdownConverter;
	private imageUploader!: ImageUploader;
	private frontmatterWriter!: FrontmatterWriter;
	private publicationLog!: PublicationLog;

	async onload(): Promise<void> {
		// ---------------------------------------------------------------------------
		// 1. Configurações
		// ---------------------------------------------------------------------------
		await this.loadSettings();
		this.addSettingTab(new SmartWriteSettingTab(this.app, this));

		// ---------------------------------------------------------------------------
		// 2. Módulo Write
		// ---------------------------------------------------------------------------
		this.statsCalculator = new StatsCalculator();

		// Registra a view do painel Write
		this.registerView(VIEW_TYPE_WRITE, (leaf: WorkspaceLeaf) =>
			new WriteView(leaf, sessionState.get(), this.settings.dailyWordGoal)
		);

		// Registra a extensão CodeMirror de realce
		this.registerEditorExtension(buildHighlightExtension(this.settings));

		// BUG-03/06 — Atualiza stats ao abrir arquivo (não só no keystroke)
		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!file) return;
				// BUG-06 — Reseta sessão ao trocar de arquivo
				if (file.path !== sessionState.get().lastActiveFile) {
					sessionState.get().reset();
					sessionState.update({ lastActiveFile: file.path });
				}
				// Lê via vault.read() pois activeEditor pode ser null quando sidebar tem foco
				void this.app.vault.read(file).then((text) => {
					this.refreshWriteStats(text);
				});
			}),
		);

		// BUG-03 — Atualiza stats ao trocar de aba
		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				const file = this.app.workspace.getActiveFile();
				if (!file) return;
				void this.app.vault.read(file).then((text) => {
					this.refreshWriteStats(text);
				});
			}),
		);

		// Atualiza stats a cada keystroke
		this.registerEvent(
			this.app.workspace.on("editor-change", (editor) => {
				this.refreshWriteStats(editor.getValue());
			}),
		);

		// Comando para abrir painel Write
		this.addCommand({
			id: "open-write-panel",
			name: "Abrir painel write",
			callback: async () => { await this.activateView(VIEW_TYPE_WRITE); },
		});

		// ---------------------------------------------------------------------------
		// 3. Módulo Feedback
		// ---------------------------------------------------------------------------
		this.ollamaClient = new OllamaClient(this.settings.ollamaEndpoint);
		this.personaLoader = new PersonaLoader();
		this.personaRunner = new PersonaRunner(this.ollamaClient);
		this.analysisQueue = new AnalysisQueue(
			this.personaRunner,
			this.app,
			this.settings.ollamaModel,
		);

		// Registra a view do painel Feedback
		this.registerView(
			VIEW_TYPE_FEEDBACK,
			(leaf: WorkspaceLeaf) =>
				new FeedbackView(leaf, this.app, () => {
					void this.runAnalysis();
				}),
		);

		// Comando para analisar com persona ativa
		this.addCommand({
			id: "analyze-with-persona",
			name: "Analisar com persona ativa",
			callback: () => { void this.runAnalysis(); },
		});

		// Comando para abrir painel Feedback
		this.addCommand({
			id: "open-feedback-panel",
			name: "Abrir painel feedback",
			callback: async () => {
				await this.activateView(VIEW_TYPE_FEEDBACK);
				// BUG-05 — Injeta persona na view após abrir
				await this.syncPersonaToFeedbackView();
			},
		});

		// ---------------------------------------------------------------------------
		// 4. Módulo Publish
		// ---------------------------------------------------------------------------
		this.substackClient = new SubstackClient(
			this.settings.substackSubdomain,
			this.settings.substackCookie,
		);
		this.markdownConverter = new MarkdownConverter();
		this.imageUploader = new ImageUploader(this.substackClient);
		this.frontmatterWriter = new FrontmatterWriter();
		this.publicationLog = new PublicationLog();

		// Comando de publicação
		this.addCommand({
			id: "publish-to-substack",
			name: "Publicar no Substack",
			callback: () => { void this.publishActiveNote(); },
		});

		// Listener de publicação completa
		this.registerEvent(
			(this.app.workspace as unknown as Events).on(
				EVENT_PUBLISH_COMPLETE,
				(data: { file: TFile; url: string; publishedAt: string; mode: string }) => {
					void this.onPublishComplete(data);
				},
			),
		);

		// ---------------------------------------------------------------------------
		// 5. Ribbon
		// ---------------------------------------------------------------------------
		this.addRibbonIcon("pencil", "SmartWrite: abrir write", () => {
			void this.activateView(VIEW_TYPE_WRITE);
		});

		// Calcula stats para a nota já aberta ao carregar o plugin
		this.app.workspace.onLayoutReady(() => {
			const editor = this.app.workspace.activeEditor?.editor;
			if (editor) this.refreshWriteStats(editor.getValue());
		});

		console.debug("[SmartWrite] loaded v" + this.manifest.version);
	}

	onunload(): void {
		// Não remove as views no onunload — Obsidian gerencia o ciclo de vida dos leaves
		// (obsidianmd/detach-leaves): remover aqui causa reset de posição do leaf
		console.debug("SmartWrite unloaded");
	}

	// ---------------------------------------------------------------------------
	// Settings
	// ---------------------------------------------------------------------------

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<SmartWriteSettings>);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	// ---------------------------------------------------------------------------
	// Write helpers
	// ---------------------------------------------------------------------------

	/**
	 * Recalcula stats do texto e propaga para WriteView.
	 * Chamado em editor-change, file-open e active-leaf-change.
	 */
	private refreshWriteStats(text: string): void {
		const state = sessionState.get();
		const elapsedMs = Date.now() - state.sessionStartTime;
		const stats = this.statsCalculator.compute(
			text,
			this.settings.longSentenceThreshold,
			elapsedMs,
		);
		sessionState.update({ wpm: stats.wpm });

		const problemCount = stats.longSentences.length + stats.repeatedWords.length;
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_WRITE)) {
			const view = leaf.view as WriteView;
			if (leaf.view.getViewType() === VIEW_TYPE_WRITE) {
				view.refresh(stats, problemCount);
			}
		}
	}

	/** Ativa (ou cria) uma view lateral pelo seu tipo */
	private async activateView(viewType: string): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(viewType);

		if (existing.length > 0) {
			void workspace.revealLeaf(existing[0]!);
		} else {
			const leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: viewType, active: true });
			void workspace.revealLeaf(leaf);
		}

		// BUG-03 — Propaga stats ao abrir o painel Write
		// Lê via vault.read() pois activeEditor pode ser null quando a sidebar tem foco
		if (viewType === VIEW_TYPE_WRITE) {
			setTimeout(() => {
				const file = this.app.workspace.getActiveFile();
				if (file) {
					void this.app.vault.read(file).then((text) => {
						this.refreshWriteStats(text);
					});
				}
			}, 100);
		}
	}

	// ---------------------------------------------------------------------------
	// Feedback helpers
	// ---------------------------------------------------------------------------

	/** Sincroniza a persona ativa para a FeedbackView (BUG-05) */
	private async syncPersonaToFeedbackView(): Promise<void> {
		// BUG-02 — Força persona bundled ignorando personasVaultPath
		// (evita falha silenciosa quando path do vault não tem o formato esperado)
		const settingsForLoad = { ...this.settings, personasVaultPath: "" };
		const persona = await this.personaLoader.load(
			this.settings.activePersona,
			this.app,
			settingsForLoad,
		);
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FEEDBACK)) {
			if (leaf.view.getViewType() === VIEW_TYPE_FEEDBACK) {
				(leaf.view as FeedbackView).setActivePersona(persona);
			}
		}
	}

	/** Dispara análise do texto atual com a persona ativa */
	private async runAnalysis(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("Abra uma nota para analisar.");
			return;
		}

		const text = await this.app.vault.read(activeFile);
		if (!text.trim()) {
			new Notice("A nota está vazia.");
			return;
		}

		// BUG-05 — Garante persona injetada na view antes de analisar
		await this.syncPersonaToFeedbackView();

		// Atualiza o estado de "analisando" na FeedbackView
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_FEEDBACK)) {
			if (leaf.view.getViewType() === VIEW_TYPE_FEEDBACK) {
				(leaf.view as FeedbackView).setAnalyzing(true);
			}
		}

		// BUG-02 — Usa bundled persona diretamente (mesmo fix do syncPersonaToFeedbackView)
		const settingsForLoad = { ...this.settings, personasVaultPath: "" };
		const persona = await this.personaLoader.load(
			this.settings.activePersona,
			this.app,
			settingsForLoad,
		);
		this.analysisQueue.enqueue(text, persona);
	}

	// ---------------------------------------------------------------------------
	// Publish helpers
	// ---------------------------------------------------------------------------

	/** Abre o modal de publicação e executa o fluxo se confirmado */
	private async publishActiveNote(): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("Abra a nota que deseja publicar.");
			return;
		}

		// BUG-01 — Notice longa (8s) quando configuração ausente
		if (!this.settings.substackCookie) {
			new Notice("SmartWrite: configure o cookie do Substack nas settings antes de publicar.", 8000);
			return;
		}
		if (!this.settings.substackSubdomain) {
			new Notice("SmartWrite: configure o subdomain do Substack nas settings antes de publicar.", 8000);
			return;
		}

		// Verifica se já foi publicada (frontmatter tem substack_url)
		const frontmatter = this.app.metadataCache.getFileCache(activeFile)?.frontmatter;
		const alreadyPublished = !!frontmatter?.substack_url;

		// Abre modal de confirmação
		new PublishModal(
			this.app,
			activeFile,
			(options) => { void this.executePublish(activeFile, options); },
			alreadyPublished,
		).open();
	}

	/** Executa o fluxo completo de publicação após confirmação */
	private async executePublish(
		file: TFile,
		options: { mode: "draft" | "publish"; audience: "everyone" | "only_paid" | "only_free" },
	): Promise<void> {
		try {
			new Notice("Publicando...");

			// Lê o conteúdo da nota
			const markdown = await this.app.vault.read(file);

			// Converte para ProseMirror
			const proseMirrorStr = this.markdownConverter.toProseMirror(markdown);
			const proseMirrorDoc = JSON.parse(proseMirrorStr) as Parameters<typeof this.imageUploader.processImages>[0];

			// Faz upload de imagens locais
			const processedDoc = await this.imageUploader.processImages(proseMirrorDoc, this.app);

			// Obtém userId das settings (evita request desnecessário)
			const userId = this.settings.substackUserId;

			// Cria o draft
			const draftId = await this.substackClient.createDraft({
				draft_title: file.basename,
				draft_subtitle: "",
				draft_body: JSON.stringify(processedDoc),
				draft_bylines: [{ id: userId, is_guest: false }],
				audience: options.audience,
				type: "newsletter",
				draft_podcast_url: null,
				draft_podcast_duration: null,
				section_chosen: false,
				draft_section_id: null,
			});

			// Publica imediatamente se modo = "publish"
			let url: string;
			if (options.mode === "publish") {
				url = await this.substackClient.publishDraft(draftId);
			} else {
				url = `https://${this.settings.substackSubdomain}.substack.com/publish/post/${draftId}`;
			}

			const publishedAt = new Date().toISOString();

			// Emite evento de publicação completa
			this.app.workspace.trigger(EVENT_PUBLISH_COMPLETE, {
				file,
				url,
				publishedAt,
				mode: options.mode,
			});

			new Notice(`✅ ${options.mode === "draft" ? "Draft criado" : "Publicado"}: ${url}`);
		} catch (error: unknown) {
			// Erros já foram exibidos via Notice no SubstackClient
			if (error instanceof Error && !error.message.startsWith("HTTP")) {
				new Notice(`Erro ao publicar: ${error.message}`);
			}
			console.debug("[SmartWrite] Publish error:", error);
		}
	}

	/** Handler do evento publish-complete — atualiza frontmatter e log */
	private async onPublishComplete(data: {
		file: TFile;
		url: string;
		publishedAt: string;
		mode: string;
	}): Promise<void> {
		try {
			// Escreve metadados no frontmatter
			await this.frontmatterWriter.write(data.file, data.url, data.publishedAt, this.app);

			// Registra no log
			await this.publicationLog.append(
				{
					filePath: data.file.path,
					substackUrl: data.url,
					publishedAt: data.publishedAt,
					mode: data.mode as "draft" | "publish",
				},
				this.app,
			);
		} catch (error) {
			console.debug("[SmartWrite] onPublishComplete error:", error);
		}
	}
}
