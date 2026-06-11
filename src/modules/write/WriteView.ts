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
	lastStats: StatsResult | null = null;

	/** Meta diária de palavras (recebida das settings) */
	private dailyWordGoal: number;

	/** Número de problemas encontrados no último scan */
	private problemCount: number = 0;

	/** Callback para abrir o painel Feedback ao clicar no botão de issues */
	private readonly onOpenFeedback: () => void;

	constructor(
		leaf: WorkspaceLeaf,
		sessionState: SessionState,
		dailyWordGoal: number,
		onOpenFeedback: () => void,
	) {
		super(leaf);
		this.sessionState = sessionState;
		this.dailyWordGoal = dailyWordGoal;
		this.onOpenFeedback = onOpenFeedback;
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

		container.empty();

		if (!this.lastStats) {
			// --- Estado vazio ---
			const emptySection = container.createEl("div", { cls: "sw-write-stats" });
			emptySection.createEl("p", {
				text: "Abra uma nota para ver as estatísticas.",
				cls: "sw-write-empty",
			});
			return;
		}

		const s = this.lastStats;

		// --- Estatísticas do documento ---
		const statsSection = container.createEl("div", { cls: "sw-write-stats" });

		const readTime = s.readingTimeMin === 0
			? "< 1 min"
			: `${s.readingTimeMin} min`;

		this.createStatRow(statsSection, "Palavras", String(s.wordCount));
		this.createStatRow(statsSection, "Leitura", readTime);
		this.createStatRow(statsSection, "Caracteres", String(s.charCount));

		// --- Estatísticas de sessão ---
		const sessionSection = container.createEl("div", { cls: "sw-write-session" });

		// WPM só aparece quando há dados reais (após 30s de digitação)
		if (this.sessionState.wpm > 0) {
			this.createStatRow(sessionSection, "Velocidade", `${this.sessionState.wpm} wpm`);
		}

		// Meta diária com porcentagem separada
		const goal = this.dailyWordGoal;
		const current = s.wordCount;
		const progress = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;

		const goalRow = sessionSection.createEl("div", { cls: "sw-stat-row" });
		goalRow.createEl("span", { text: "Meta do dia", cls: "sw-stat-label" });

		const goalValueEl = goalRow.createEl("span", { cls: "sw-stat-value" });
		goalValueEl.appendText(`${current} / ${goal} `);
		goalValueEl.createEl("span", { text: `(${progress}%)`, cls: "sw-goal-pct" });

		// Barra de progresso visual
		const progressBar = sessionSection.createEl("div", { cls: "sw-progress-bar" });
		progressBar.createEl("div", {
			cls: "sw-progress-fill",
			attr: { style: `width: ${progress}%` },
		});

		// --- Issues: botão que abre o painel Feedback ---
		if (this.problemCount > 0) {
			const alertSection = container.createEl("div", { cls: "sw-write-alert" });
			const label = this.problemCount === 1
				? "1 ponto de atenção — ver no Feedback"
				: `${this.problemCount} pontos de atenção — ver no Feedback`;

			const btn = alertSection.createEl("button", {
				text: label,
				cls: "sw-alert-btn",
			});
			btn.addEventListener("click", () => { this.onOpenFeedback(); });
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
