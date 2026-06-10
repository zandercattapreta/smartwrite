// ==============================================================================
// SCRIPT: WriteView.ts
// DESCRIÇÃO: ItemView do painel lateral do Módulo Write — exibe estatísticas em tempo real
// CHAMADO POR: main.ts (this.registerView), evento smartwrite:highlights-updated
// TRAZ (CHAMA/IMPORTA): obsidian (ItemView, WorkspaceLeaf), types.ts, state.ts
// CONTRATO (RESPOSTA ESPERADA): Painel lateral persistente com stats de sessão.
//   Atualiza ao receber evento smartwrite:highlights-updated.
//   Usa containerEl da API do Obsidian — nunca document.querySelector().
// ==============================================================================

import { ItemView, WorkspaceLeaf } from "obsidian";
import type { SessionState } from "../../state";
import type { StatsResult } from "../../types";

// Identificador único da view (usado em registerView e activateLeaf)
export const VIEW_TYPE_WRITE = "smartwrite-write";

// ---------------------------------------------------------------------------
// WriteView — painel lateral de estatísticas de escrita
// ---------------------------------------------------------------------------

/** Painel lateral que exibe estatísticas de escrita em tempo real */
export class WriteView extends ItemView {
	/** Estado da sessão atual (referência compartilhada com main.ts) */
	private readonly sessionState: SessionState;

	/** Último StatsResult recebido — null antes do primeiro cálculo */
	private lastStats: StatsResult | null = null;

	/** Meta diária de palavras (recebida das settings) */
	private dailyWordGoal: number;

	/** Número de problemas encontrados no último scan */
	private problemCount: number = 0;

	constructor(leaf: WorkspaceLeaf, sessionState: SessionState, dailyWordGoal: number) {
		super(leaf);
		this.sessionState = sessionState;
		this.dailyWordGoal = dailyWordGoal;
	}

	/** Identificador único da view */
	getViewType(): string {
		return VIEW_TYPE_WRITE;
	}

	/** Título exibido no painel lateral */
	getDisplayText(): string {
		return "Write";
	}

	/** Ícone da view na barra lateral */
	getIcon(): string {
		return "pencil";
	}

	/** Renderização inicial do painel */
	async onOpen(): Promise<void> {
		this.render();
	}

	async onClose(): Promise<void> {
		// Nenhuma limpeza adicional necessária
	}

	/**
	 * Atualiza as estatísticas exibidas no painel.
	 * Chamado a cada keystroke via evento smartwrite:highlights-updated.
	 *
	 * @param stats - StatsResult do StatsCalculator
	 * @param problemCount - Número de problemas encontrados (frases longas + repetições)
	 */
	refresh(stats: StatsResult, problemCount: number): void {
		this.lastStats = stats;
		this.problemCount = problemCount;
		this.render();
	}

	/**
	 * Renderiza o painel com os dados atuais.
	 * Usa containerEl da API do Obsidian — nunca manipula document diretamente.
	 */
	private render(): void {
		const container = this.containerEl.children[1];
		if (!container) return;

		// Limpa o conteúdo anterior
		container.empty();

		// --- Stats do documento ---
		const statsSection = container.createEl("div", { cls: "sw-write-stats" });

		if (this.lastStats) {
			const s = this.lastStats;

			// Palavras totais
			const readTime = s.readingTimeMin === 0
				? "< 1 min"
				: `${s.readingTimeMin} min`;
			this.createStatRow(statsSection, "Words", String(s.wordCount));
			this.createStatRow(statsSection, "Reading time", readTime);
			this.createStatRow(statsSection, "Characters", String(s.charCount));
		} else {
			statsSection.createEl("p", {
				text: "Open a note to see statistics.",
				cls: "sw-write-empty",
			});
		}

		// --- Estatísticas de sessão ---
		const sessionSection = container.createEl("div", { cls: "sw-write-session" });

		this.createStatRow(sessionSection, "WPM", String(this.sessionState.wpm));

		// Progresso em relação à meta diária
		const goal = this.dailyWordGoal;
		const current = this.lastStats?.wordCount ?? 0;
		const progress = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
		this.createStatRow(sessionSection, "Daily goal", `${current} / ${goal} (${progress}%)`);

		// Barra de progresso visual
		const progressBar = sessionSection.createEl("div", { cls: "sw-progress-bar" });
		progressBar.createEl("div", {
			cls: "sw-progress-fill",
			attr: { style: `width: ${progress}%` },
		});

		// --- Problemas encontrados ---
		if (this.problemCount > 0) {
			const alertSection = container.createEl("div", { cls: "sw-write-alert" });
			const label = this.problemCount === 1 ? "issue found" : "issues found";
			alertSection.createEl("span", {
				text: `${this.problemCount} ${label}`,
				cls: "sw-alert-text",
			});
		}
	}

	/**
	 * Cria uma linha de estatística (label + valor) no container informado.
	 * @param parent - Elemento pai onde inserir a linha
	 * @param label - Rótulo da estatística
	 * @param value - Valor a exibir
	 */
	private createStatRow(parent: Element, label: string, value: string): void {
		const row = parent.createEl("div", { cls: "sw-stat-row" });
		row.createEl("span", { text: label, cls: "sw-stat-label" });
		row.createEl("span", { text: value, cls: "sw-stat-value" });
	}
}
