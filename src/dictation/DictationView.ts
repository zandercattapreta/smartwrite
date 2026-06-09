import { ItemView, WorkspaceLeaf, MarkdownView } from "obsidian";
import { DictationManager, DictationState } from "./DictationManager";
import { SmartWriteSettings, LANGUAGE_OPTIONS, MODEL_OPTIONS } from "../settings/SmartWriteSettings";

export const DICTATION_VIEW_TYPE = "smartwrite-dictation";

export class DictationView extends ItemView {
	private manager: DictationManager;
	private settings: SmartWriteSettings;
	private onSettingsChange: (patch: Partial<SmartWriteSettings>) => Promise<void>;

	// UI refs
	private btnRecord:    HTMLButtonElement | null = null;
	private btnCancel:    HTMLButtonElement | null = null;
	private statusEl:     HTMLElement       | null = null;
	private timerEl:      HTMLElement       | null = null;
	private timerInterval: ReturnType<typeof setInterval> | null = null;
	private recordStart:  number = 0;

	constructor(
		leaf: WorkspaceLeaf,
		settings: SmartWriteSettings,
		manager: DictationManager,
		onSettingsChange: (patch: Partial<SmartWriteSettings>) => Promise<void>,
	) {
		super(leaf);
		this.settings         = settings;
		this.manager          = manager;
		this.onSettingsChange = onSettingsChange;
	}

	getViewType():    string { return DICTATION_VIEW_TYPE; }
	getDisplayText(): string { return "SmartWrite · Ditado"; }
	getIcon():        string { return "mic"; }

	async onOpen(): Promise<void> {
		this.buildUI();
	}

	async onClose(): Promise<void> {
		this.manager.cancel();
		this.stopTimer();
	}

	// ---------------------------------------------------------------------------
	// UI build
	// ---------------------------------------------------------------------------

	private buildUI(): void {
		const root = this.containerEl.children[1] as HTMLElement;
		root.empty();
		root.addClass("sw-dictation");

		// Header
		root.createEl("h4", { text: "🎙 Ditado" });

		// Status badge
		this.statusEl = root.createEl("div", { cls: "sw-status sw-status--idle", text: "Pronto para gravar" });

		// Timer
		this.timerEl = root.createEl("div", { cls: "sw-timer", text: "00:00" });

		// Record button
		this.btnRecord = root.createEl("button", { cls: "sw-btn sw-btn--record", text: "⏺ Gravar" });
		this.btnRecord.id = "sw-btn-record";
		this.btnRecord.addEventListener("click", () => this.handleToggle());

		// Cancel button (hidden by default)
		this.btnCancel = root.createEl("button", { cls: "sw-btn sw-btn--cancel sw-hidden", text: "✕ Cancelar" });
		this.btnCancel.id = "sw-btn-cancel";
		this.btnCancel.addEventListener("click", () => this.handleCancel());

		// Divider
		root.createEl("hr");

		// Language selector
		this.buildSelect(
			root,
			"Idioma",
			"sw-select-lang",
			LANGUAGE_OPTIONS.map(o => ({ value: o.value, label: o.label })),
			this.settings.dictationLanguage,
			async (v) => this.onSettingsChange({ dictationLanguage: v }),
		);

		// Model selector
		this.buildSelect(
			root,
			"Modelo Whisper",
			"sw-select-model",
			MODEL_OPTIONS.map(o => ({ value: o.value, label: `${o.label}  (${o.size})` })),
			this.settings.whisperModel,
			async (v) => this.onSettingsChange({ whisperModel: v }),
		);
	}

	private buildSelect(
		parent: HTMLElement,
		label: string,
		id: string,
		options: { value: string; label: string }[],
		current: string,
		onChange: (v: string) => Promise<void>,
	): void {
		const wrap = parent.createEl("div", { cls: "sw-field" });
		wrap.createEl("label", { text: label, attr: { for: id } });

		const sel = wrap.createEl("select", { attr: { id } });
		for (const opt of options) {
			const el = sel.createEl("option", { text: opt.label, value: opt.value });
			if (opt.value === current) el.selected = true;
		}
		sel.addEventListener("change", () => onChange(sel.value));
	}

	// ---------------------------------------------------------------------------
	// Interaction handlers
	// ---------------------------------------------------------------------------

	private async handleToggle(): Promise<void> {
		const state = this.manager.currentState;

		if (state === "idle") {
			await this.manager.toggle(this.getActiveEditor());
			this.onStateChange("recording");
		} else if (state === "recording") {
			this.onStateChange("transcribing");
			await this.manager.toggle(this.getActiveEditor());
		}
	}

	private handleCancel(): void {
		this.manager.cancel();
		this.onStateChange("idle");
	}

	// Called by DictationManager's state callback
	onStateChange(state: DictationState): void {
		this.stopTimer();

		switch (state) {
			case "idle":
				this.statusEl!.className  = "sw-status sw-status--idle";
				this.statusEl!.textContent = "Pronto para gravar";
				this.btnRecord!.textContent = "⏺ Gravar";
				this.btnRecord!.classList.remove("sw-btn--stop");
				this.btnCancel!.classList.add("sw-hidden");
				this.timerEl!.textContent = "00:00";
				break;

			case "recording":
				this.statusEl!.className  = "sw-status sw-status--recording";
				this.statusEl!.textContent = "Gravando…";
				this.btnRecord!.textContent = "⏹ Parar";
				this.btnRecord!.classList.add("sw-btn--stop");
				this.btnCancel!.classList.remove("sw-hidden");
				this.startTimer();
				break;

			case "transcribing":
				this.statusEl!.className  = "sw-status sw-status--transcribing";
				this.statusEl!.textContent = "Transcrevendo…";
				this.btnRecord!.disabled   = true;
				this.btnCancel!.classList.add("sw-hidden");
				break;
		}

		if (state !== "transcribing") {
			this.btnRecord!.disabled = false;
		}
	}

	// ---------------------------------------------------------------------------
	// Timer helpers
	// ---------------------------------------------------------------------------

	private startTimer(): void {
		this.recordStart = Date.now();
		this.timerInterval = setInterval(() => {
			const elapsed = Math.floor((Date.now() - this.recordStart) / 1000);
			const mm      = String(Math.floor(elapsed / 60)).padStart(2, "0");
			const ss      = String(elapsed % 60).padStart(2, "0");
			if (this.timerEl) this.timerEl.textContent = `${mm}:${ss}`;
		}, 1000);
	}

	private stopTimer(): void {
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
			this.timerInterval = null;
		}
	}

	private getActiveEditor(): import("obsidian").Editor | undefined {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		return view?.editor;
	}
}
