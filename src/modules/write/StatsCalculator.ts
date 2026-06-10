// ==============================================================================
// SCRIPT: StatsCalculator.ts
// DESCRIÇÃO: Funções puras de análise estatística de texto (sem side effects)
// CHAMADO POR: main.ts (listener editor-change), WriteView.ts
// TRAZ (CHAMA/IMPORTA): types.ts (StatsResult, HighlightSpan)
// CONTRATO (RESPOSTA ESPERADA): Exporta StatsCalculator com métodos testáveis
//   via vitest — sem qualquer import de 'obsidian' ou dependência de runtime.
// ==============================================================================

import type { HighlightSpan, StatsResult } from "../../types";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Velocidade de leitura média em palavras por minuto (base científica ~200wpm) */
const READING_SPEED_WPM = 200;

/**
 * Frequência mínima de repetição para marcar uma palavra como frequente.
 * Palavras que aparecem mais que este percentual do total são marcadas.
 */
const REPEATED_WORD_MIN_COUNT = 3;

/** Palavras funcionais que não devem ser contadas como repetições problemáticas */
const STOP_WORDS = new Set([
	"o", "a", "os", "as", "um", "uma", "uns", "umas",
	"de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas",
	"por", "para", "com", "sem", "sob", "sobre", "entre", "até",
	"e", "ou", "mas", "porém", "contudo", "todavia", "entretanto",
	"que", "se", "não", "nem", "já", "ainda", "também",
	"the", "a", "an", "and", "or", "but", "in", "on", "at", "to",
	"for", "of", "with", "by", "from", "is", "are", "was", "were",
	"it", "its", "this", "that", "these", "those", "i", "you", "he",
	"she", "we", "they", "my", "your", "his", "her", "our", "their",
]);

// ---------------------------------------------------------------------------
// StatsCalculator — classe de análise estatística
// ---------------------------------------------------------------------------

/**
 * Calculadora de estatísticas de texto.
 * Todas as funções são puras — sem side effects, sem imports de 'obsidian'.
 */
export class StatsCalculator {
	/**
	 * Conta o número de palavras em um texto.
	 * Ignora espaços múltiplos, tabs e quebras de linha.
	 * @param text - Texto puro para analisar
	 * @returns Número de palavras (0 para texto vazio ou só espaços)
	 */
	countWords(text: string): number {
		// Remove espaços extremos e divide por qualquer sequência de espaços/tabs/quebras
		const trimmed = text.trim();
		if (trimmed.length === 0) return 0;

		// Divide por qualquer espaço em branco (inclui tabs, newlines)
		const words = trimmed.split(/\s+/);
		return words.filter((w) => w.length > 0).length;
	}

	/**
	 * Conta caracteres no texto (excluindo espaços).
	 * @param text - Texto puro para analisar
	 * @returns Número de caracteres sem espaços
	 */
	countChars(text: string): number {
		return text.replace(/\s/g, "").length;
	}

	/**
	 * Estima o tempo de leitura em minutos com base no número de palavras.
	 * Base: 200 palavras por minuto. Mínimo retornado: 1 minuto.
	 * @param wordCount - Número de palavras do texto
	 * @returns Tempo estimado em minutos (inteiro, mínimo 1)
	 */
	estimateReadingTime(wordCount: number): number {
		if (wordCount <= 0) return 0;
		// Arredonda para cima: 1–200 = 1min, 201–400 = 2min, etc.
		return Math.max(1, Math.ceil(wordCount / READING_SPEED_WPM));
	}

	/**
	 * Calcula WPM (palavras por minuto) com base no tempo decorrido.
	 * @param wordCount - Número de palavras escritas
	 * @param elapsedMs - Tempo decorrido em milissegundos
	 * @returns WPM arredondado (0 se elapsed < 1 segundo)
	 */
	calculateWPM(wordCount: number, elapsedMs: number): number {
		// Exige pelo menos 30s de sessão para evitar valores absurdos
		// logo após o reset de sessão (file-open)
		if (elapsedMs < 30_000 || wordCount <= 0) return 0;
		const minutes = elapsedMs / 60_000;
		return Math.round(wordCount / minutes);
	}

	/**
	 * Identifica frases longas no texto e retorna seus spans de posição.
	 *
	 * Estratégia:
	 * 1. Divide o texto em frases por pontuação terminal (. ! ? seguidos de espaço/fim)
	 * 2. Para cada frase, conta as palavras
	 * 3. Frases acima do threshold têm seu offset calculado no texto original
	 *
	 * @param text - Texto puro para analisar
	 * @param threshold - Número de palavras acima do qual a frase é considerada longa
	 * @returns Array de HighlightSpan com type "long-sentence"
	 */
	findLongSentences(text: string, threshold: number): HighlightSpan[] {
		if (text.trim().length === 0) return [];

		const spans: HighlightSpan[] = [];
		// Regex que captura a frase + o delimitador para reconstruir offset
		// Divide por . ! ? seguidos de espaço ou fim de string
		const sentenceRegex = /[^.!?]+[.!?]*/g;
		let match: RegExpExecArray | null;

		while ((match = sentenceRegex.exec(text)) !== null) {
			const sentence = match[0];
			const sentenceText = sentence.trim();
			if (sentenceText.length === 0) continue;

			const wordCount = this.countWords(sentenceText);
			if (wordCount > threshold) {
				// Calcula o offset real no texto original (inclui espaços iniciais)
				const from = match.index;
				const to = match.index + sentence.length;
				spans.push({ from, to, type: "long-sentence" });
			}
		}

		return spans;
	}

	/**
	 * Identifica palavras repetidas com frequência anormal no texto.
	 *
	 * Estratégia:
	 * 1. Tokeniza o texto em palavras (lowercase, sem pontuação)
	 * 2. Conta ocorrências de cada palavra
	 * 3. Exclui stop words e palavras com < 4 caracteres
	 * 4. Palavras com count >= REPEATED_WORD_MIN_COUNT são marcadas
	 * 5. Mapeia todas as ocorrências de volta para spans no texto original
	 *
	 * @param text - Texto puro para analisar
	 * @returns Array de HighlightSpan com type "repeated-word"
	 */
	findRepeatedWords(text: string): HighlightSpan[] {
		if (text.trim().length === 0) return [];

		// Tokenização: extrai palavras com seus offsets
		const wordRegex = /\b[a-záàãâéêíóôõúüç-]+\b/gi;
		const tokens: Array<{ word: string; from: number; to: number }> = [];
		let wMatch: RegExpExecArray | null;

		while ((wMatch = wordRegex.exec(text)) !== null) {
			tokens.push({
				word: wMatch[0].toLowerCase(),
				from: wMatch.index,
				to: wMatch.index + wMatch[0].length,
			});
		}

		// Conta ocorrências de cada palavra significativa
		const frequency = new Map<string, number>();
		for (const token of tokens) {
			// Ignora stop words e palavras muito curtas
			if (STOP_WORDS.has(token.word) || token.word.length < 4) continue;
			frequency.set(token.word, (frequency.get(token.word) ?? 0) + 1);
		}

		// Identifica quais palavras são repetidas acima do threshold
		const repeatedWords = new Set<string>();
		for (const [word, count] of frequency.entries()) {
			if (count >= REPEATED_WORD_MIN_COUNT) {
				repeatedWords.add(word);
			}
		}

		// Mapeia os tokens repetidos para spans
		const spans: HighlightSpan[] = [];
		for (const token of tokens) {
			if (repeatedWords.has(token.word)) {
				spans.push({ from: token.from, to: token.to, type: "repeated-word" });
			}
		}

		return spans;
	}

	/**
	 * Executa a análise completa de um texto e retorna StatsResult.
	 * Este é o método principal chamado a cada keystroke pelo listener editor-change.
	 *
	 * @param text - Texto puro do editor
	 * @param threshold - Limite de palavras para frase longa
	 * @param elapsedMs - Tempo decorrido da sessão em ms (para WPM)
	 * @returns StatsResult com todas as métricas calculadas
	 */
	compute(text: string, threshold: number = 40, elapsedMs: number = 0): StatsResult {
		const wordCount = this.countWords(text);
		const charCount = this.countChars(text);
		const readingTimeMin = this.estimateReadingTime(wordCount);
		const wpm = this.calculateWPM(wordCount, elapsedMs);
		const longSentences = this.findLongSentences(text, threshold);
		const repeatedWords = this.findRepeatedWords(text);

		return {
			wordCount,
			charCount,
			readingTimeMin,
			wpm,
			longSentences,
			repeatedWords,
		};
	}
}
