import { Plugin, MarkdownView } from "obsidian";
import { SmartWriteSettings, DEFAULT_SETTINGS } from "./settings/SmartWriteSettings";
import { DictationManager } from "./dictation/DictationManager";
import { DictationView, DICTATION_VIEW_TYPE } from "./dictation/DictationView";

export default class SmartWrite extends Plugin {
	settings: SmartWriteSettings = DEFAULT_SETTINGS;
	private dictationManager: DictationManager | null = null;

	// ---------------------------------------------------------------------------
	// Lifecycle
	// ---------------------------------------------------------------------------

	async onload(): Promise<void> {
		await this.loadSettings();
		this.initDictation();
		this.registerCommands();
	}

	async onunload(): Promise<void> {
		this.dictationManager?.cancel();
	}

	// ---------------------------------------------------------------------------
	// Settings
	// ---------------------------------------------------------------------------

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async patchSettings(patch: Partial<SmartWriteSettings>): Promise<void> {
		Object.assign(this.settings, patch);
		await this.saveSettings();
	}

	// ---------------------------------------------------------------------------
	// Dictation
	// ---------------------------------------------------------------------------

	private initDictation(): void {
		// Create the manager — state changes will propagate to whichever view is open
		this.dictationManager = new DictationManager(
			this.settings,
			(state) => {
				// Propagate state to the sidebar view if it is open
				const leaves = this.app.workspace.getLeavesOfType(DICTATION_VIEW_TYPE);
				for (const leaf of leaves) {
					(leaf.view as DictationView).onStateChange(state);
				}
			},
		);

		// Register the sidebar view
		this.registerView(
			DICTATION_VIEW_TYPE,
			(leaf) => new DictationView(
				leaf,
				this.settings,
				this.dictationManager!,
				(patch) => this.patchSettings(patch),
			),
		);

		// Ribbon icon
		this.addRibbonIcon("mic", "SmartWrite · Ditado", () => {
			this.activateDictationView();
		});
	}

	private registerCommands(): void {
		// Open / focus sidebar
		this.addCommand({
			id:   "open-dictation-view",
			name: "Abrir painel de ditado",
			callback: () => this.activateDictationView(),
		});

		// Toggle recording directly from command palette / hotkey
		this.addCommand({
			id:   "toggle-dictation",
			name: "Iniciar / Parar ditado",
			editorCallback: (editor) => {
				this.dictationManager?.toggle(editor);
			},
		});

		// Cancel recording
		this.addCommand({
			id:   "cancel-dictation",
			name: "Cancelar ditado",
			callback: () => {
				this.dictationManager?.cancel();
			},
		});
	}

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	private async activateDictationView(): Promise<void> {
		const { workspace } = this.app;

		let leaf = workspace.getLeavesOfType(DICTATION_VIEW_TYPE)[0];

		if (!leaf) {
			leaf = workspace.getRightLeaf(false) ?? workspace.getLeaf(true);
			await leaf.setViewState({ type: DICTATION_VIEW_TYPE, active: true });
		}

		workspace.revealLeaf(leaf);
	}
}
