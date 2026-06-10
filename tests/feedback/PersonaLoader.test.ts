// ==============================================================================
// TEST: PersonaLoader.test.ts
// DESCRIÇÃO: Testes unitários do PersonaLoader (mock do vault do Obsidian)
// MÓDULO TESTADO: src/modules/feedback/PersonaLoader.ts
// NOTA: PersonaLoader usa duck typing (VaultReadable) — não importa de 'obsidian',
//       portanto não precisa de mocks do runtime.
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PersonaLoader } from "../../src/modules/feedback/PersonaLoader";
import type { SmartWriteSettings } from "../../src/types";

// ---------------------------------------------------------------------------
// Mock do vault (duck type compatível com VaultReadable)
// ---------------------------------------------------------------------------

/** Cria um mock do vault com conteúdo configurável */
function createMockApp(vaultContent: Record<string, string> = {}) {
	return {
		vault: {
			getAbstractFileByPath: (path: string): unknown => {
				if (path in vaultContent) {
					// Retorna um TAbstractFile-like com o path
					return { path };
				}
				return null;
			},
			read: async (file: { path: string }): Promise<string> => {
				const content = vaultContent[file.path];
				if (!content) throw new Error(`File not found: ${file.path}`);
				return content;
			},
		},
	};
}

/** Settings padrão com vaultPath vazio */
const defaultSettings: Partial<SmartWriteSettings> = {
	personasVaultPath: "",
	activePersona: "common-reader",
} as SmartWriteSettings;

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

describe("PersonaLoader", () => {
	let loader: PersonaLoader;

	beforeEach(() => {
		loader = new PersonaLoader();
		vi.clearAllMocks();
	});

	it("retorna persona bundled quando vaultPath está vazio", async () => {
		const app = createMockApp();
		const settings = { ...defaultSettings, personasVaultPath: "" } as SmartWriteSettings;

		const persona = await loader.load("common-reader", app, settings);

		expect(persona.id).toBe("common-reader");
		expect(persona.source).toBe("bundled");
		expect(persona.systemPrompt.length).toBeGreaterThan(0);
	});

	it("retorna persona bundled quando arquivo do vault não existe", async () => {
		const app = createMockApp({}); // vault vazio
		const settings = { ...defaultSettings, personasVaultPath: "personas" } as SmartWriteSettings;

		const persona = await loader.load("common-reader", app, settings);

		expect(persona.source).toBe("bundled");
	});

	it("prioriza persona do vault quando arquivo existe e é válido", async () => {
		const vaultMarkdown = `---
id: common-reader
nome: Custom Reader
---

## Prompt do sistema

\`\`\`text
Você é uma persona customizada do vault.
\`\`\`
`;

		const app = createMockApp({ "personas/common-reader.md": vaultMarkdown });
		const settings = { ...defaultSettings, personasVaultPath: "personas" } as SmartWriteSettings;

		const persona = await loader.load("common-reader", app, settings);

		expect(persona.source).toBe("vault");
		expect(persona.nome).toBe("Custom Reader");
		expect(persona.systemPrompt).toBe("Você é uma persona customizada do vault.");
	});

	it("retorna persona bundled quando arquivo do vault tem frontmatter inválido", async () => {
		const invalidMarkdown = `Sem frontmatter aqui.

## Prompt do sistema

texto sem bloco de código.
`;

		const app = createMockApp({ "personas/common-reader.md": invalidMarkdown });
		const settings = { ...defaultSettings, personasVaultPath: "personas" } as SmartWriteSettings;

		const persona = await loader.load("common-reader", app, settings);

		expect(persona.source).toBe("bundled");
	});

	it("retorna persona 'critical-editor' bundled corretamente", async () => {
		const app = createMockApp();
		const settings = { ...defaultSettings, personasVaultPath: "" } as SmartWriteSettings;

		const persona = await loader.load("critical-editor", app, settings);

		expect(persona.id).toBe("critical-editor");
		expect(persona.source).toBe("bundled");
		expect(persona.systemPrompt).toContain("editor");
	});

	it("retorna fallback bundled para persona desconhecida", async () => {
		const app = createMockApp();
		const settings = { ...defaultSettings, personasVaultPath: "" } as SmartWriteSettings;

		const persona = await loader.load("unknown-persona-xyz", app, settings);

		// Fallback é o common-reader
		expect(persona.id).toBe("common-reader");
		expect(persona.source).toBe("bundled");
	});
});
