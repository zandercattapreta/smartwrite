import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	resolve: {
		alias: {
			// Mapeia 'obsidian' ao mock para que os testes não dependam do runtime do Obsidian
			obsidian: path.resolve(__dirname, "tests/__mocks__/obsidian.ts"),
		},
	},
	test: {
		// Ambiente padrão: node (sem DOM — Obsidian não roda no browser em testes)
		environment: "node",

		// Cobertura de código via v8 (nativo, sem instrumentação)
		coverage: {
			provider: "v8",
			reporter: ["text", "lcov"],
			include: ["src/**/*.ts"],
			exclude: [
				"src/main.ts",      // entry point — testado manualmente no vault
				"src/**/*View.ts",  // Views do Obsidian — testadas manualmente
				"src/**/*Modal.ts", // Modals do Obsidian — testadas manualmente
			],
		},

		// Pasta de testes
		include: ["tests/**/*.test.ts"],

		// Globals habilitados (describe, it, expect sem import)
		globals: true,
	},
});
