// ==============================================================================
// SCRIPT: CadenceAnalyzer.ts
// DESCRIÇÃO: Análise rítmica de texto SEM IA — funções puras testáveis
// CHAMADO POR: FeedbackView (análise de cadência local complementar ao Ollama)
// TRAZ (CHAMA/IMPORTA): types.ts (HighlightSpan)
// CONTRATO (RESPOSTA ESPERADA): Funções puras sem efeitos colaterais.
//   calculateBurstiness() → 0.0–1.0 (variância de comprimento de frases)
//   getSentenceLengths() → number[]
//   identifyMonotonousBlocks() → HighlightSpan[] (blocos com burstiness < 0.3)
// ==============================================================================

import type { HighlightSpan } from "../../types";

// Limiar abaixo do qual um bloco é considerado monótono
const MONOTONY_THRESHOLD = 0.3;
// Número mínimo de frases para calcular burstiness de um bloco
const MIN_SENTENCES_FOR_BLOCK = 3;

/**
 * Analisador rítmico de texto — sem IA, sem imports externos.
 * Todas as funções são puras: entrada → saída sem efeitos colaterais.
 */
export class CadenceAnalyzer {
	/**
	 * Calcula o "burstiness" (variância rítmica) de um texto.
	 *
	 * Burstiness alto (≥0.7) = bom: mistura de frases curtas e longas.
	 * Burstiness baixo (<0.3) = ruim: texto monótono com frases uniformes.
	 *
	 * Fórmula: (σ - μ) / (σ + μ) adaptada de Goh & Barabási (2008),
	 * normalizada para [0, 1] onde 0 = mínimo de variação.
	 *
	 * @param text - Texto a analisar
	 * @returns Valor de 0.0 a 1.0 (0 = monótono, 1 = muito variado)
	 */
	calculateBurstiness(text: string): number {
		const lengths = this.getSentenceLengths(text);
		if (lengths.length < 2) return 0;

		const mean = lengths.reduce((sum, l) => sum + l, 0) / lengths.length;
		if (mean === 0) return 0;

		const variance = lengths.reduce((sum, l) => sum + Math.pow(l - mean, 2), 0) / lengths.length;
		const stdDev = Math.sqrt(variance);

		// Normaliza para [0, 1] usando a fórmula de burstiness
		const raw = (stdDev - mean) / (stdDev + mean);

		// Mapeia de [-1, 1] para [0, 1]
		return Math.max(0, Math.min(1, (raw + 1) / 2));
	}

	/**
	 * Extrai o comprimento (em palavras) de cada frase do texto.
	 * Frases são delimitadas por `.`, `!`, `?` seguidos de espaço ou fim de linha.
	 * Linhas em branco também atuam como delimitadores.
	 *
	 * @param text - Texto a processar
	 * @returns Array com o número de palavras por frase (sem frases vazias)
	 */
	getSentenceLengths(text: string): number[] {
		if (!text.trim()) return [];

		// Divide por terminadores de frase ou duas quebras de linha
		const sentences = text
			.split(/[.!?]+[\s]+|[.!?]+$|\n{2,}/g)
			.map(s => s.trim())
			.filter(s => s.length > 0);

		return sentences.map(s => this.countWords(s)).filter(n => n > 0);
	}

	/**
	 * Identifica blocos de texto com ritmo monótono (burstiness < 0.3).
	 * Analisa janelas deslizantes de MIN_SENTENCES_FOR_BLOCK frases.
	 * Retorna os spans dos blocos problemáticos no texto original.
	 *
	 * @param text - Texto a analisar
	 * @returns Array de HighlightSpan dos blocos monótonos (type: "passive-voice" como proxy)
	 */
	identifyMonotonousBlocks(text: string): HighlightSpan[] {
		if (!text.trim()) return [];

		// Divide o texto em frases com suas posições
		const sentenceSpans = this.extractSentenceSpans(text);
		if (sentenceSpans.length < MIN_SENTENCES_FOR_BLOCK) return [];

		const result: HighlightSpan[] = [];

		// Janela deslizante de MIN_SENTENCES_FOR_BLOCK frases
		for (let i = 0; i <= sentenceSpans.length - MIN_SENTENCES_FOR_BLOCK; i++) {
			const window = sentenceSpans.slice(i, i + MIN_SENTENCES_FOR_BLOCK);
			const windowText = window.map(s => s.text).join(" ");
			const burstiness = this.calculateBurstiness(windowText);

			if (burstiness < MONOTONY_THRESHOLD) {
				const from = window[0]?.from ?? 0;
				const to = window[window.length - 1]?.to ?? 0;

				// Evita spans duplicados ou sobrepostos
				const last = result[result.length - 1];
				if (!last || to > last.to) {
					result.push({ from, to, type: "passive-voice" });
				}
			}
		}

		return result;
	}

	// ---------------------------------------------------------------------------
	// Helpers privados
	// ---------------------------------------------------------------------------

	/**
	 * Conta palavras em um texto (tokens separados por espaço).
	 */
	private countWords(text: string): number {
		return text.trim().split(/\s+/).filter(w => w.length > 0).length;
	}

	/**
	 * Extrai frases com suas posições absolutas no texto original.
	 */
	private extractSentenceSpans(text: string): Array<{ text: string; from: number; to: number }> {
		const spans: Array<{ text: string; from: number; to: number }> = [];
		const regex = /[^.!?\n]+[.!?]*/g;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			const trimmed = match[0].trim();
			if (trimmed.length > 0) {
				spans.push({
					text: trimmed,
					from: match.index,
					to: match.index + match[0].length,
				});
			}
		}

		return spans;
	}
}
