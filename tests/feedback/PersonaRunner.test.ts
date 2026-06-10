// ==============================================================================
// TEST: PersonaRunner.test.ts
// DESCRIÇÃO: Testes unitários do PersonaRunner com mock do OllamaClient
// MÓDULO TESTADO: src/modules/feedback/PersonaRunner.ts
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PersonaRunner } from "../../src/modules/feedback/PersonaRunner";
import type { OllamaClient } from "../../src/modules/feedback/OllamaClient";
import type { PersonaDefinition } from "../../src/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Persona de teste */
const mockPersona: PersonaDefinition = {
	id: "test-persona",
	nome: "Test persona",
	systemPrompt: "Você é uma persona de testes.",
	source: "bundled",
};

/** Cria um mock do OllamaClient */
function createMockClient(generateFn: () => Promise<string>) {
	return {
		generate: vi.fn().mockImplementation(generateFn),
		checkHealth: vi.fn().mockResolvedValue(true),
	};
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("PersonaRunner", () => {
	let runner: PersonaRunner;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("retorna [] quando Ollama retorna JSON inválido", async () => {
		const client = createMockClient(async () => "Isso não é JSON válido.");
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("Texto de teste.", mockPersona, "test-model");

		expect(results).toEqual([]);
	});

	it("retorna [] quando Ollama retorna string vazia", async () => {
		const client = createMockClient(async () => "");
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("Texto de teste.", mockPersona, "test-model");

		expect(results).toEqual([]);
	});

	it("retorna [] quando Ollama retorna JSON que não é array", async () => {
		const client = createMockClient(async () => `{"key": "value"}`);
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("Texto.", mockPersona, "test-model");

		expect(results).toEqual([]);
	});

	it("parseia corretamente resposta JSON válida", async () => {
		const mockResponse = JSON.stringify([
			{ excerpt: "trecho problemático", issue: "descrição do problema", severity: "high" },
			{ excerpt: "outro trecho", issue: "outro problema", severity: "low" },
		]);

		const client = createMockClient(async () => mockResponse);
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("Texto de teste.", mockPersona, "test-model");

		expect(results).toHaveLength(2);
		expect(results[0]!.excerpt).toBe("trecho problemático");
		expect(results[0]!.issue).toBe("descrição do problema");
		expect(results[0]!.severity).toBe("high");
		expect(results[0]!.personaId).toBe("test-persona");
		expect(results[0]!.timestamp).toBeTypeOf("number");
		expect(results[1]!.severity).toBe("low");
	});

	it("parseia resposta JSON precedida por texto extra", async () => {
		// Ollama às vezes adiciona texto antes do JSON
		const mockResponse =
			"Aqui está minha análise:\n\n" +
			JSON.stringify([{ excerpt: "trecho", issue: "problema", severity: "medium" }]);

		const client = createMockClient(async () => mockResponse);
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("Texto.", mockPersona, "test-model");

		expect(results).toHaveLength(1);
		expect(results[0]!.severity).toBe("medium");
	});

	it("nunca propaga exceção quando Ollama lança erro", async () => {
		const client = createMockClient(async () => {
			throw new Error("Connection refused");
		});
		runner = new PersonaRunner(client as unknown as OllamaClient);

		// Não deve lançar
		const results = await runner.run("Texto.", mockPersona, "test-model");

		expect(results).toEqual([]);
	});

	it("nunca propaga exceção para texto vazio", async () => {
		const client = createMockClient(async () => "[]");
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("", mockPersona, "test-model");

		expect(results).toEqual([]);
	});

	it("filtra items com severity inválido", async () => {
		const mockResponse = JSON.stringify([
			{ excerpt: "trecho", issue: "problema", severity: "invalid" }, // inválido
			{ excerpt: "trecho2", issue: "problema2", severity: "high" }, // válido
		]);

		const client = createMockClient(async () => mockResponse);
		runner = new PersonaRunner(client as unknown as OllamaClient);

		const results = await runner.run("Texto.", mockPersona, "test-model");

		// Apenas o item válido deve aparecer
		expect(results).toHaveLength(1);
		expect(results[0]!.severity).toBe("high");
	});
});
