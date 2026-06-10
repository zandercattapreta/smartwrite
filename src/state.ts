// ==============================================================================
// SCRIPT: state.ts
// DESCRIÇÃO: Singleton em memória do estado da sessão de escrita ativa
// CHAMADO POR: main.ts (onload/onunload), StatsCalculator, WriteView
// TRAZ (CHAMA/IMPORTA): types.ts (SessionStateData)
// CONTRATO (RESPOSTA ESPERADA): Exporta sessionState (singleton) — criado no módulo,
//   vive durante toda a sessão do Obsidian.
//   SessionState: classe com os dados.
//   sessionState: instância singleton com interface get/update.
// ==============================================================================

import type { SessionStateData } from "./types";

// ---------------------------------------------------------------------------
// SessionState — estado em memória da sessão de escrita
//
// Razão de ser singleton em memória (não persistido):
//   Persistir em data.json cria edge cases de desync quando o plugin é
//   recarregado no meio da sessão ou o vault está aberto em dois dispositivos.
//   "Sessão" é semanticamente correto apenas enquanto o Obsidian está aberto.
// ---------------------------------------------------------------------------

/** Singleton de estado da sessão de escrita ativa */
export class SessionState implements SessionStateData {
	/** Total de palavras escritas nesta sessão */
	sessionWordCount: number = 0;

	/** Timestamp de quando a sessão iniciou (Date.now()) */
	sessionStartTime: number = Date.now();

	/** Caminho do último arquivo ativo (TFile.path) */
	lastActiveFile: string = "";

	/** Palavras por minuto calculados na sessão atual */
	wpm: number = 0;

	/**
	 * Reseta os contadores da sessão, preservando o startTime.
	 * Chamado ao trocar de arquivo (evento file-open do Obsidian).
	 */
	reset(): void {
		this.sessionWordCount = 0;
		this.sessionStartTime = Date.now();
		this.wpm = 0;
		// Nota: lastActiveFile é atualizado pelo caller APÓS o reset,
		// pois o evento file-open fornece o novo arquivo
	}

	/**
	 * Atualiza a contagem de palavras e recalcula o WPM.
	 * @param wordCount - Total de palavras no documento atual
	 */
	updateWordCount(wordCount: number): void {
		this.sessionWordCount = wordCount;

		// Calcula WPM: palavras / minutos decorridos
		const elapsedMs = Date.now() - this.sessionStartTime;
		const elapsedMinutes = elapsedMs / 60_000;

		// Evita divisão por zero e valores irreais (< 5 segundos de sessão)
		if (elapsedMinutes > 0.083) {
			this.wpm = Math.round(this.sessionWordCount / elapsedMinutes);
		}
	}
}

// ---------------------------------------------------------------------------
// Wrapper singleton com interface get/update (compatível com main.ts)
// ---------------------------------------------------------------------------

/** Interface simplificada para acesso ao estado de sessão a partir do main.ts */
class SessionStateWrapper {
	private readonly _state: SessionState = new SessionState();

	/** Retorna o estado atual da sessão */
	get(): SessionState {
		return this._state;
	}

	/** Atualiza campos parciais do estado */
	update(partial: Partial<SessionStateData>): void {
		Object.assign(this._state, partial);
	}
}

/** Singleton de estado — use este nas classes que precisam de get/update */
export const sessionState = new SessionStateWrapper();
