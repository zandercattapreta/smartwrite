/**
 * Mock do módulo 'obsidian' para uso em testes vitest.
 * Exporta apenas o que é usado pelos módulos testáveis (sem DOM, sem Obsidian runtime).
 * Localização: tests/__mocks__/obsidian.ts
 */

/** parseYaml — usa js-yaml via polyfill simples (apenas frontmatter básico) */
export function parseYaml(text: string): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	const lines = text.split("\n");
	for (const line of lines) {
		const colonIdx = line.indexOf(":");
		if (colonIdx < 0) continue;
		const key = line.slice(0, colonIdx).trim();
		const rawValue = line.slice(colonIdx + 1).trim();
		if (!key) continue;
		// Remove aspas se presentes
		const value = rawValue.replace(/^["']|["']$/g, "");
		result[key] = value;
	}
	return result;
}

/** App stub — apenas o que PersonaLoader usa */
export class App {
	vault = {
		getAbstractFileByPath: (_path: string): unknown => null,
		read: async (_file: unknown): Promise<string> => "",
	};
	metadataCache = {
		getFileCache: (_file: unknown): unknown => null,
	};
}

/** Notice stub */
export class Notice {
	constructor(_message: string) {
		// no-op
	}
}

/** Plugin stub */
export class Plugin {}

/** Modal stub */
export class Modal {
	contentEl = {
		empty: () => undefined,
		addClass: (_cls: string) => undefined,
		createEl: (_tag: string, _opts?: unknown) => ({
			textContent: "",
			disabled: false,
			addEventListener: (_event: string, _handler: unknown) => undefined,
			createEl: (_t: string, _o?: unknown) => ({
				textContent: "",
				addEventListener: (_e: string, _h: unknown) => undefined,
			}),
		}),
	};
	constructor(_app: unknown) {}
	open(): void {}
	close(): void {}
}

/** Setting stub */
export class Setting {
	constructor(_container: unknown) {}
	setName(_name: string): this { return this; }
	setDesc(_desc: string): this { return this; }
	addDropdown(_fn: unknown): this { return this; }
	addText(_fn: unknown): this { return this; }
	addToggle(_fn: unknown): this { return this; }
}

/** ItemView stub */
export class ItemView {
	containerEl = { children: [null, { empty: () => undefined, addClass: () => undefined, createEl: () => ({}) }] };
	app: unknown;
	leaf: unknown;
	constructor(_leaf: unknown) {}
	getViewType(): string { return ""; }
	getDisplayText(): string { return ""; }
	getIcon(): string { return ""; }
	async onOpen(): Promise<void> {}
	async onClose(): Promise<void> {}
	registerEvent(_event: unknown): void {}
}

/** WorkspaceLeaf stub */
export class WorkspaceLeaf {}

/** TFile stub */
export class TFile {
	path = "";
	basename = "";
	extension = "";
}

/** MarkdownRenderer stub */
export const MarkdownRenderer = {
	render: async (): Promise<void> => {},
};

/** requestUrl stub — rejeitado com not-implemented em testes */
export async function requestUrl(_params: unknown): Promise<{ status: number; json: unknown; text: string }> {
	return { status: 200, json: {}, text: "" };
}
