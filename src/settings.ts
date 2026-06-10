// ==============================================================================
// SCRIPT: settings.ts
// DESCRIÇÃO: Interface SmartWriteSettings, defaults e SettingTab com todas as seções
// CHAMADO POR: main.ts (instanciação e registro do SettingTab)
// TRAZ (CHAMA/IMPORTA): obsidian (App, Plugin, PluginSettingTab, Setting, Notice)
// CONTRATO (RESPOSTA ESPERADA): Exporta DEFAULT_SETTINGS e SmartWriteSettingTab
// ==============================================================================

import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { SmartWriteSettings } from "./types";

// ---------------------------------------------------------------------------
// Valores padrão para todas as configurações
// ---------------------------------------------------------------------------

/** Configurações padrão — usadas na primeira carga e como fallback */
export const DEFAULT_SETTINGS: SmartWriteSettings = {
	// Write
	highlightLongSentences: true,
	longSentenceThreshold: 40,
	highlightFrequentWords: true,
	writeViewSide: "right",
	dailyWordGoal: 500,

	// Feedback
	ollamaEndpoint: "http://localhost:11434",
	ollamaModel: "qwen2.5",
	activePersona: "common-reader",
	personasVaultPath: "",
	analysisIntervalMs: 0,
	feedbackViewSide: "right",

	// Publish
	substackCookie: "",
	substackSubdomain: "",
	substackUserId: 0,
	defaultAudience: "only_paid",
	defaultPublishMode: "draft",
};

// ---------------------------------------------------------------------------
// SettingTab — UI de configurações do plugin
// ---------------------------------------------------------------------------

/** Tab de configurações do SmartWrite, agrupada por módulo */
export class SmartWriteSettingTab extends PluginSettingTab {
	/** Referência ao plugin pai para acesso às settings e saveData() */
	private readonly plugin: Plugin & { settings: SmartWriteSettings; saveSettings(): Promise<void> };

	constructor(
		app: App,
		plugin: Plugin & { settings: SmartWriteSettings; saveSettings(): Promise<void> },
	) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/** Renderiza a tab de configurações completa */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Write module")
			.setHeading();

		new Setting(containerEl)
			.setName("Highlight long sentences")
			.setDesc("Highlights sentences with more words than the configured limit.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.highlightLongSentences)
					.onChange(async (value) => {
						this.plugin.settings.highlightLongSentences = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Long sentence limit (words)")
			.setDesc("Sentences above this word count will be highlighted.")
			.addSlider((slider) => {
				slider
					.setLimits(10, 100, 5)
					.setValue(this.plugin.settings.longSentenceThreshold)
					.onChange(async (value) => {
						this.plugin.settings.longSentenceThreshold = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Highlight frequent words")
			.setDesc("Highlights words that repeat with high frequency in the text.")
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.highlightFrequentWords)
					.onChange(async (value) => {
						this.plugin.settings.highlightFrequentWords = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Write panel position")
			.setDesc("Side of the screen where the statistics panel will appear.")
			.addDropdown((dd) => {
				dd
					.addOption("left", "Left")
					.addOption("right", "Right")
					.setValue(this.plugin.settings.writeViewSide)
					.onChange(async (value) => {
						this.plugin.settings.writeViewSide = value as "left" | "right";
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Daily word goal")
			.setDesc("Number of words to write per day.")
			.addText((text) => {
				text
					.setPlaceholder("500")
					.setValue(String(this.plugin.settings.dailyWordGoal))
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!isNaN(parsed) && parsed > 0) {
							this.plugin.settings.dailyWordGoal = parsed;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName("Feedback module (Ollama)")
			.setHeading();

		new Setting(containerEl)
			.setName("Ollama endpoint")
			.setDesc("Base URL of the local Ollama server (default: HTTP://localhost:11434).")
			.addText((text) => {
				text
					.setPlaceholder("HTTP://localhost:11434")
					.setValue(this.plugin.settings.ollamaEndpoint)
					.onChange(async (value) => {
						this.plugin.settings.ollamaEndpoint = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Ollama model")
			.setDesc("Name of the model to use for analysis (e.g. Llama3, mistral).")
			.addText((text) => {
				text
					.setPlaceholder("Llama3")
					.setValue(this.plugin.settings.ollamaModel)
					.onChange(async (value) => {
						this.plugin.settings.ollamaModel = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Personas folder path in vault")
			.setDesc("Folder with custom persona .md files. Leave empty to use bundled personas.")
			.addText((text) => {
				text
					.setPlaceholder("_docs/personas")
					.setValue(this.plugin.settings.personasVaultPath)
					.onChange(async (value) => {
						this.plugin.settings.personasVaultPath = value.trim();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Feedback panel position")
			.setDesc("Side of the screen where the feedback panel will appear.")
			.addDropdown((dd) => {
				dd
					.addOption("left", "Left")
					.addOption("right", "Right")
					.setValue(this.plugin.settings.feedbackViewSide)
					.onChange(async (value) => {
						this.plugin.settings.feedbackViewSide = value as "left" | "right";
						await this.plugin.saveSettings();
					});
			});

		// ---- Seção: Módulo Publish ----
		new Setting(containerEl)
			.setName("Publish module (Substack)")
			.setHeading();

		// Aviso de segurança obrigatório (ARQUITETURA.md §3.3)
		new Setting(containerEl)
			.setName("Security notice")
			.setDesc(
				"Do not sync data.json via Git or iCloud while the cookie field is filled in. " +
				"Add the plugin data.json to your vault .gitignore to protect credentials.",
			);

		new Setting(containerEl)
			.setName("Substack subdomain")
			.setDesc("Your publication subdomain on Substack.com.")
			.addText((text) => {
				text
					.setPlaceholder("Your-subdomain")
					.setValue(this.plugin.settings.substackSubdomain)
					.onChange(async (value) => {
						this.plugin.settings.substackSubdomain = value.trim().toLowerCase();
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Substack cookie")
			.setDesc("Authentication cookie value. Open DevTools → application → cookies → connect.sid")
			.addText((text) => {
				// Campo mascarado como password (ARQUITETURA.md §3.3)
				text.inputEl.type = "password";
				text
					.setPlaceholder("Paste the connect.sid value here")
					.setValue(this.plugin.settings.substackCookie)
					.onChange(async (value) => {
						// SEGURANÇA: nunca logar substackCookie
						this.plugin.settings.substackCookie = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Substack user ID")
			.setDesc("Your numeric Substack user ID (from GET /API/v1/user/self, field: ID).")
			.addText((text) => {
				text
					.setPlaceholder("466115474")
					.setValue(this.plugin.settings.substackUserId > 0 ? String(this.plugin.settings.substackUserId) : "")
					.onChange(async (value) => {
						const parsed = parseInt(value, 10);
						if (!isNaN(parsed) && parsed > 0) {
							this.plugin.settings.substackUserId = parsed;
							await this.plugin.saveSettings();
						}
					});
			});

		new Setting(containerEl)
			.setName("Default audience")
			.setDesc("Audience used when creating drafts or posts.")
			.addDropdown((dd) => {
				dd
					.addOption("only_paid", "Paid subscribers only")
					.addOption("everyone", "Everyone")
					.addOption("only_free", "Free subscribers only")
					.setValue(this.plugin.settings.defaultAudience)
					.onChange(async (value) => {
						this.plugin.settings.defaultAudience = value as SmartWriteSettings["defaultAudience"];
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Default publish mode")
			.setDesc("Publish as draft or immediately by default.")
			.addDropdown((dd) => {
				dd
					.addOption("draft", "Draft")
					.addOption("publish", "Publish immediately")
					.setValue(this.plugin.settings.defaultPublishMode)
					.onChange(async (value) => {
						this.plugin.settings.defaultPublishMode = value as "draft" | "publish";
						await this.plugin.saveSettings();
					});
			});

		// Botão de teste de conexão com Substack
		new Setting(containerEl)
			.setName("Test Substack connection")
			.setDesc("Checks if the cookie is valid by calling /API/v1/user/self.")
			.addButton((btn) => {
				btn
					.setButtonText("Test")
					.onClick(() => {
						if (!this.plugin.settings.substackCookie || !this.plugin.settings.substackSubdomain) {
							new Notice("Fill in the cookie and subdomain before testing.");
							return;
						}
						new Notice("Testing connection...");
						// Lógica de teste será implementada no SubstackClient
					});
			});
	}
}
