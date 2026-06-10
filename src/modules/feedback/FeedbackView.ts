// ==============================================================================
// SCRIPT: FeedbackView.ts
// DESCRIÇÃO: ItemView do painel lateral do módulo Feedback
// CHAMADO POR: main.ts (this.registerView)
// TRAZ (CHAMA/IMPORTA): obsidian (ItemView, WorkspaceLeaf, App, MarkdownRenderer),
//   types.ts (FeedbackResult), AnalysisQueue, PersonaLoader
// CONTRATO (RESPOSTA ESPERADA):
//   VIEW_TYPE = "smartwrite-feedback"
//   Exibe: lista de FeedbackResult[] agrupados por persona
//   Botão "Analisar" → AnalysisQueue.enqueue()
//   Ouve: smartwrite:analysis-ready → re-renderiza resultados
//   Ouve: smartwrite:analysis-cleared → limpa resultados
//   Mostra estado "Analisando..." enquanto fila processa (não-bloqueante)
// ==============================================================================

import { ItemView, MarkdownRenderer, WorkspaceLeaf } from "obsidian";
import type { App, Events } from "obsidian";
import type { FeedbackResult, PersonaDefinition } from "../../types";
import { EVENT_ANALYSIS_READY } from "./AnalysisQueue";

export const VIEW_TYPE_FEEDBACK = "smartwrite-feedback";

// ---------------------------------------------------------------------------
// Severity badge helpers
// ---------------------------------------------------------------------------

/** Mapa de severity → rótulo exibido */
const SEVERITY_LABEL: Record<string, string> = {
	low: "Low",
	medium: "Medium",
	high: "High",
};

/** Mapa de severity → classe CSS para cor do badge */
const SEVERITY_CLASS: Record<string, string> = {
	low: "sw-badge-low",
	medium: "sw-badge-medium",
	high: "sw-badge-high",
};

// ---------------------------------------------------------------------------
// FeedbackView
// ---------------------------------------------------------------------------

/** Painel lateral do módulo Feedback — exibe resultados de análise por persona */
export class FeedbackView extends ItemView {
	/** Resultados da última análise */
	private results: FeedbackResult[] = [];
	/** Flag de estado de análise em andamento */
	private isAnalyzing = false;
	/** Persona selecionada no momento */
	private activePersona: PersonaDefinition | null = null;

	/** Callback para disparar análise (injetado pelo main.ts) */
	private readonly onAnalyze: () => void;

	constructor(
		leaf: WorkspaceLeaf,
		app: App,
		onAnalyze: () => void,
	) {
		super(leaf);
		this.app = app;
		this.onAnalyze = onAnalyze;
	}

	getViewType(): string {
		return VIEW_TYPE_FEEDBACK;
	}

	getDisplayText(): string {
		return "Feedback";
	}

	getIcon(): string {
		return "message-square";
	}

	async onOpen(): Promise<void> {
		// Inscreve no evento de análise completa
		this.registerEvent(
			(this.app.workspace as unknown as Events).on(EVENT_ANALYSIS_READY, (results: FeedbackResult[]) => {
				this.results = results;
				this.isAnalyzing = false;
				this.render();
			}),
		);

		this.render();
	}

	/**
	 * Atualiza a persona ativa (chamado pelo main.ts quando settings mudam).
	 */
	setActivePersona(persona: PersonaDefinition): void {
		this.activePersona = persona;
		this.render();
	}

	/**
	 * Marca a view como "analisando" e re-renderiza.
	 * Chamado pelo main.ts ao disparar AnalysisQueue.enqueue().
	 */
	setAnalyzing(analyzing: boolean): void {
		this.isAnalyzing = analyzing;
		this.render();
	}

	/** Limpa os resultados exibidos */
	clearResults(): void {
		this.results = [];
		this.isAnalyzing = false;
		this.render();
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	/** Reconstrói todo o DOM do painel */
	private render(): void {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.addClass("sw-feedback-view");

		// Header
		this.renderHeader(container);

		// Estado: analisando
		if (this.isAnalyzing) {
			this.renderAnalyzing(container);
			return;
		}

		// Estado: sem resultados
		if (this.results.length === 0) {
			this.renderEmpty(container);
			return;
		}

		// Estado: com resultados
		this.renderResults(container);
	}

	private renderHeader(container: HTMLElement): void {
		const header = container.createEl("div", { cls: "sw-feedback-header" });

		// Persona ativa
		const personaName = this.activePersona?.nome ?? "Common reader";
		header.createEl("div", {
			text: personaName,
			cls: "sw-feedback-persona-label",
		});

		// Botão analisar
		const analyzeBtn = header.createEl("button", {
			text: this.isAnalyzing ? "Analisando..." : "Analisar",
			cls: "sw-btn-analyze",
		});
		analyzeBtn.disabled = this.isAnalyzing;
		analyzeBtn.addEventListener("click", () => {
			this.isAnalyzing = true;
			this.render();
			this.onAnalyze();
		});
	}

	private renderAnalyzing(container: HTMLElement): void {
		const el = container.createEl("div", { cls: "sw-feedback-state" });
		el.createEl("div", { cls: "sw-spinner" });
		el.createEl("p", { text: "Analyzing...", cls: "sw-feedback-state-text" });
	}

	private renderEmpty(container: HTMLElement): void {
		const el = container.createEl("div", { cls: "sw-feedback-state" });
		el.createEl("p", {
			text: "No feedback yet. Click analisar to start.",
			cls: "sw-feedback-state-text",
		});
	}

	private renderResults(container: HTMLElement): void {
		// Agrupa resultados por persona
		const grouped = this.groupByPersona(this.results);

		for (const [personaId, items] of Object.entries(grouped)) {
			const section = container.createEl("div", { cls: "sw-feedback-section" });

			// Header da seção da persona
			section.createEl("div", {
				text: personaId,
				cls: "sw-feedback-section-header",
			});

			// Lista de feedback items
			for (const item of items) {
				this.renderFeedbackItem(section, item);
			}
		}
	}

	private renderFeedbackItem(container: HTMLElement, item: FeedbackResult): void {
		const card = container.createEl("div", { cls: "sw-feedback-card" });

		// Badge de severidade
		const badgeClass = SEVERITY_CLASS[item.severity] ?? "sw-badge-low";
		const badgeLabel = SEVERITY_LABEL[item.severity] ?? item.severity;
		card.createEl("span", {
			text: badgeLabel,
			cls: `sw-badge ${badgeClass}`,
		});

		// Trecho problemático
		card.createEl("blockquote", {
			text: item.excerpt,
			cls: "sw-feedback-excerpt",
		});

		// Descrição do problema
		const issueEl = card.createEl("p", { cls: "sw-feedback-issue" });
		// Usa MarkdownRenderer para suporte a formatação inline
		MarkdownRenderer.render(this.app, item.issue, issueEl, "", this).catch(() => {
			// Fallback: texto puro
			issueEl.textContent = item.issue;
		});
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	private groupByPersona(results: FeedbackResult[]): Record<string, FeedbackResult[]> {
		const grouped: Record<string, FeedbackResult[]> = {};
		for (const result of results) {
			if (!grouped[result.personaId]) {
				grouped[result.personaId] = [];
			}
			grouped[result.personaId]!.push(result);
		}
		return grouped;
	}
}
