// ==============================================================================
// SCRIPT: AnalysisQueue.ts
// DESCRIÇÃO: Fila assíncrona FIFO (concorrência 1) para análise com Ollama
// CHAMADO POR: FeedbackView (ao clicar "Analisar"), main.ts
// TRAZ (CHAMA/IMPORTA): obsidian (App), types.ts (FeedbackResult)
// CONTRATO (RESPOSTA ESPERADA):
//   enqueue() → dispara análise em background (não bloqueia)
//   cancel() → cancela análise em andamento
//   isRunning() → boolean
//   Emite evento ao concluir: app.workspace.trigger('smartwrite:analysis-ready', results)
//   Se enqueue() chamado enquanto análise roda → cancela a anterior e inicia nova
// ==============================================================================

import type { App } from "obsidian";
import type { FeedbackResult, PersonaDefinition } from "../../types";
import type { PersonaRunner } from "./PersonaRunner";

// Evento emitido ao concluir análise
export const EVENT_ANALYSIS_READY = "smartwrite:analysis-ready";

/** Fila assíncrona com concorrência 1 para análise de texto com Ollama */
export class AnalysisQueue {
	private readonly runner: PersonaRunner;
	private readonly app: App;
	private readonly model: string;

	/** Flag para cancelar a análise em andamento */
	private cancelled = false;
	/** Flag de estado da fila */
	private running = false;

	/**
	 * @param runner - PersonaRunner configurado
	 * @param app - Instância do Obsidian App (para disparar eventos)
	 * @param model - Nome do modelo Ollama a usar
	 */
	constructor(runner: PersonaRunner, app: App, model: string) {
		this.runner = runner;
		this.app = app;
		this.model = model;
	}

	/**
	 * Encola uma nova análise.
	 * Se já houver uma em andamento, cancela a anterior antes de iniciar.
	 * A análise roda em background — nunca bloqueia o thread principal.
	 *
	 * @param text - Texto a analisar
	 * @param persona - PersonaDefinition a usar
	 */
	enqueue(text: string, persona: PersonaDefinition): void {
		// Cancela análise anterior se estiver rodando
		if (this.running) {
			this.cancel();
		}

		// Inicia nova análise em background (não awaited intencionalmente)
		this.runAnalysis(text, persona).catch((error: unknown) => {
			console.debug("[SmartWrite] AnalysisQueue: erro inesperado", error);
		});
	}

	/**
	 * Cancela a análise em andamento.
	 * O PersonaRunner concluirá o request HTTP atual, mas o resultado será descartado.
	 */
	cancel(): void {
		this.cancelled = true;
		this.running = false;
	}

	/**
	 * Retorna true se uma análise estiver em andamento.
	 */
	isRunning(): boolean {
		return this.running;
	}

	/**
	 * Executa a análise em background.
	 * Emite smartwrite:analysis-ready ao concluir (se não cancelado).
	 */
	private async runAnalysis(text: string, persona: PersonaDefinition): Promise<void> {
		this.cancelled = false;
		this.running = true;

		try {
			const results: FeedbackResult[] = await this.runner.run(text, persona, this.model);

			// Verifica se foi cancelado enquanto a IA processava
			if (this.cancelled) return;

			// Emite evento com os resultados
			this.app.workspace.trigger(EVENT_ANALYSIS_READY, results);
		} finally {
			// Sempre limpa o estado de running ao terminar
			if (!this.cancelled) {
				this.running = false;
			}
		}
	}
}
