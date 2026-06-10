// ==============================================================================
// SCRIPT: StatsCalculator.test.ts
// DESCRIÇÃO: Testes unitários do StatsCalculator — funções puras sem mocks
// CHAMADO POR: vitest (npm test)
// TRAZ (CHAMA/IMPORTA): vitest (describe, it, expect), StatsCalculator
// CONTRATO (RESPOSTA ESPERADA): Todos os testes passando; cobertura das funções puras
// ==============================================================================

import { describe, it, expect } from "vitest";
import { StatsCalculator } from "../../src/modules/write/StatsCalculator";

const calc = new StatsCalculator();

// ---------------------------------------------------------------------------
// countWords
// ---------------------------------------------------------------------------

describe("countWords", () => {
	it("retorna 0 para string vazia", () => {
		expect(calc.countWords("")).toBe(0);
	});

	it("retorna 0 para string com apenas espaços", () => {
		expect(calc.countWords("   ")).toBe(0);
	});

	it("conta duas palavras simples", () => {
		expect(calc.countWords("olá mundo")).toBe(2);
	});

	it("ignora múltiplos espaços entre palavras", () => {
		expect(calc.countWords("  vários   espaços  ")).toBe(2);
	});

	it("conta uma única palavra", () => {
		expect(calc.countWords("palavra")).toBe(1);
	});

	it("conta palavras separadas por tab ou quebra de linha", () => {
		expect(calc.countWords("um\tdois\ntrês")).toBe(3);
	});

	it("conta palavras com hífen como uma palavra", () => {
		// "bem-vindo" é um token separado por espaços, logo conta como 1
		expect(calc.countWords("bem-vindo ao mundo")).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// findLongSentences
// ---------------------------------------------------------------------------

describe("findLongSentences", () => {
	it("retorna array vazio para texto vazio", () => {
		expect(calc.findLongSentences("", 10)).toEqual([]);
	});

	it("retorna array vazio quando nenhuma frase ultrapassa o threshold", () => {
		const texto = "Frase curta. Outra frase curta.";
		const resultado = calc.findLongSentences(texto, 40);
		expect(resultado).toHaveLength(0);
	});

	it("detecta frase acima do threshold e retorna o span correto", () => {
		// Gera uma frase com 50 palavras (acima do threshold de 40)
		const fraseComMuitasPalavras = Array(50).fill("palavra").join(" ") + ".";
		const resultado = calc.findLongSentences(fraseComMuitasPalavras, 40);
		expect(resultado.length).toBeGreaterThan(0);
		expect(resultado[0]!.type).toBe("long-sentence");
	});

	it("retorna from e to como números não-negativos", () => {
		const fraseLonga = Array(45).fill("palavra").join(" ") + ".";
		const spans = calc.findLongSentences(fraseLonga, 40);
		for (const span of spans) {
			expect(span.from).toBeGreaterThanOrEqual(0);
			expect(span.to).toBeGreaterThan(span.from);
		}
	});

	it("não detecta frases abaixo do threshold", () => {
		const texto = "Curta. Muito curta mesmo.";
		const resultado = calc.findLongSentences(texto, 40);
		expect(resultado).toHaveLength(0);
	});

	it("funciona com threshold igual ao número de palavras da frase", () => {
		// Frase com exatamente 5 palavras, threshold = 5 → NÃO deve aparecer (> não >=)
		const texto = "Uma frase com cinco palavras.";
		const resultado = calc.findLongSentences(texto, 5);
		expect(resultado).toHaveLength(0);
	});

	it("funciona com threshold menor que o número de palavras", () => {
		// Frase com 6 palavras, threshold = 5 → deve aparecer
		const texto = "Uma frase com seis palavras aqui.";
		const resultado = calc.findLongSentences(texto, 5);
		expect(resultado.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// estimateReadingTime
// ---------------------------------------------------------------------------

describe("estimateReadingTime", () => {
	it("retorna 0 para 0 palavras", () => {
		expect(calc.estimateReadingTime(0)).toBe(0);
	});

	it("retorna 1 para textos com 1 a 200 palavras", () => {
		expect(calc.estimateReadingTime(1)).toBe(1);
		expect(calc.estimateReadingTime(100)).toBe(1);
		expect(calc.estimateReadingTime(200)).toBe(1);
	});

	it("retorna 2 para 201 a 400 palavras", () => {
		expect(calc.estimateReadingTime(201)).toBe(2);
		expect(calc.estimateReadingTime(400)).toBe(2);
	});

	it("retorna 5 para 1000 palavras", () => {
		expect(calc.estimateReadingTime(1000)).toBe(5);
	});

	it("arredonda para cima (ceil)", () => {
		// 300 palavras / 200 wpm = 1.5 → ceil = 2
		expect(calc.estimateReadingTime(300)).toBe(2);
	});

	it("retorna valor negativo-safe (wordCount negativo → 0)", () => {
		// Proteção: wordCount nunca deve ser negativo, mas se for → mínimo 1
		expect(calc.estimateReadingTime(-1)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// calculateWPM
// ---------------------------------------------------------------------------

describe("calculateWPM", () => {
	it("retorna 0 quando elapsed < 1 segundo", () => {
		expect(calc.calculateWPM(100, 500)).toBe(0);
	});

	it("retorna 0 para 0 palavras", () => {
		expect(calc.calculateWPM(0, 60_000)).toBe(0);
	});

	it("calcula corretamente 200wpm em 1 minuto", () => {
		expect(calc.calculateWPM(200, 60_000)).toBe(200);
	});

	it("calcula corretamente para 2 minutos", () => {
		expect(calc.calculateWPM(400, 120_000)).toBe(200);
	});
});

// ---------------------------------------------------------------------------
// compute (integração das funções)
// ---------------------------------------------------------------------------

describe("compute", () => {
	it("retorna StatsResult com todas as propriedades para texto vazio", () => {
		const result = calc.compute("");
		expect(result).toMatchObject({
			wordCount: 0,
			charCount: 0,
			readingTimeMin: 0,
			wpm: 0,
			longSentences: [],
			repeatedWords: [],
		});
	});

	it("retorna wordCount correto para texto simples", () => {
		const result = calc.compute("Olá mundo cruel");
		expect(result.wordCount).toBe(3);
	});

	it("detecta frases longas quando texto tem muitas palavras", () => {
		const texto = Array(50).fill("palavra").join(" ") + ".";
		const result = calc.compute(texto, 40);
		expect(result.longSentences.length).toBeGreaterThan(0);
	});
});
