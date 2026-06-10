import { defineConfig } from "vitest/config";

export default defineConfig({
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
