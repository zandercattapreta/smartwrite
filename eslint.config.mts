import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.js", "manifest.json", "vitest.config.ts"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// Configurações personalizadas do SmartWrite para a regra sentence-case:
		// Adiciona marcas/produtos reconhecidos como proper nouns (casing preservado).
		// Deve estar no mesmo objeto que tem o plugin obsidianmd disponível.
		plugins: { obsidianmd },
		rules: {
			"obsidianmd/ui/sentence-case": [
				"error",
				{
					brands: ["Ollama", "Substack", "SmartWrite", "WPM", "ID", "URL", "HTTP", "API", "DevTools", "GET", "POST"],
				},
			],
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"esbuild.config.mjs",
		"eslint.config.js",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"vitest.config.ts",
		"vite.config.ts",
	]),
);
