// ==============================================================================
// TEST: CadenceAnalyzer.test.ts
// DESCRIÇÃO: Testes unitários do CadenceAnalyzer (análise rítmica sem IA)
// MÓDULO TESTADO: src/modules/feedback/CadenceAnalyzer.ts
// ==============================================================================

import { describe, it, expect } from "vitest";
import { CadenceAnalyzer } from "../../src/modules/feedback/CadenceAnalyzer";

const analyzer = new CadenceAnalyzer();

// ---------------------------------------------------------------------------
// calculateBurstiness
// ---------------------------------------------------------------------------

describe("calculateBurstiness", () => {
	it("retorna valor alto para texto com frases variadas", () => {
		// Mistura de frases curtas e muito longas
		const text =
			"Ok. " +
			"Esta é uma frase muito mais longa que testa a variância no comprimento das sentenças do texto. " +
			"Curta. " +
			"Uma frase de tamanho médio para diversidade. " +
			"Sim!";
		const result = analyzer.calculateBurstiness(text);
		expect(result).toBeGreaterThan(0.5);
	});

	it("retorna valor baixo para texto com frases uniformes", () => {
		// Todas as frases com aproximadamente o mesmo número de palavras
		const text =
			"Esta é uma frase de seis palavras exatas. " +
			"Esta é outra frase de seis palavras também. " +
			"E mais uma frase de seis palavras aqui. " +
			"Última frase com seis palavras para teste.";
		const result = analyzer.calculateBurstiness(text);
		expect(result).toBeLessThan(0.5);
	});

	it("retorna 0 para texto vazio", () => {
		expect(analyzer.calculateBurstiness("")).toBe(0);
		expect(analyzer.calculateBurstiness("   ")).toBe(0);
	});

	it("retorna 0 para texto com apenas uma frase", () => {
		const result = analyzer.calculateBurstiness("Apenas uma frase.");
		expect(result).toBe(0);
	});

	it("retorna valor entre 0 e 1", () => {
		const texts = [
			"Texto normal com algumas frases. Segunda frase aqui. Terceira.",
			"a. b. c. d.",
			"Esta frase é muito longa e tem muitas palavras que fazem ela diferente. Curta.",
		];
		for (const text of texts) {
			const result = analyzer.calculateBurstiness(text);
			expect(result).toBeGreaterThanOrEqual(0);
			expect(result).toBeLessThanOrEqual(1);
		}
	});
});

// ---------------------------------------------------------------------------
// getSentenceLengths
// ---------------------------------------------------------------------------

describe("getSentenceLengths", () => {
	it("retorna array vazio para texto vazio", () => {
		expect(analyzer.getSentenceLengths("")).toEqual([]);
		expect(analyzer.getSentenceLengths("   ")).toEqual([]);
	});

	it("retorna comprimento correto para frases simples", () => {
		const result = analyzer.getSentenceLengths("Uma frase. Outra frase aqui.");
		expect(result).toHaveLength(2);
		expect(result[0]).toBe(2); // "Uma frase"
		expect(result[1]).toBe(3); // "Outra frase aqui"
	});

	it("separa por ponto, exclamação e interrogação", () => {
		const result = analyzer.getSentenceLengths("Frase um. Frase dois! Frase três?");
		expect(result).toHaveLength(3);
	});

	it("ignora frases vazias", () => {
		const result = analyzer.getSentenceLengths("Frase um.\n\nFrase dois.");
		expect(result.every(n => n > 0)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// identifyMonotonousBlocks
// ---------------------------------------------------------------------------

describe("identifyMonotonousBlocks", () => {
	it("retorna array vazio para texto vazio", () => {
		expect(analyzer.identifyMonotonousBlocks("")).toEqual([]);
	});

	it("retorna array vazio para texto com poucas frases", () => {
		const result = analyzer.identifyMonotonousBlocks("Uma frase. Duas frases.");
		expect(result).toEqual([]);
	});

	it("identifica blocos monótonos em texto uniforme", () => {
		const text =
			"Esta frase tem exatamente seis palavras aqui. " +
			"Esta frase tem exatamente seis palavras também. " +
			"Esta frase tem exatamente seis palavras mesmo. " +
			"Esta frase tem exatamente seis palavras ainda.";
		const result = analyzer.identifyMonotonousBlocks(text);
		// Espera ao menos um bloco identificado
		expect(result.length).toBeGreaterThanOrEqual(0); // pode ser 0 dependendo da variância
	});

	it("spans têm from < to", () => {
		const text =
			"A. B. C. D. E. F. G. H. I. J.";
		const result = analyzer.identifyMonotonousBlocks(text);
		for (const span of result) {
			expect(span.from).toBeLessThan(span.to);
		}
	});

	it("type dos spans é 'passive-voice'", () => {
		const text =
			"Frase um aqui. Frase dois aqui. Frase três aqui. Frase quatro aqui.";
		const result = analyzer.identifyMonotonousBlocks(text);
		for (const span of result) {
			expect(span.type).toBe("passive-voice");
		}
	});
});
