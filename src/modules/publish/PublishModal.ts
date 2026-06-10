// ==============================================================================
// SCRIPT: PublishModal.ts
// DESCRIÇÃO: Modal de confirmação antes de publicar no Substack
// CHAMADO POR: main.ts (comando "SmartWrite: Publicar no Substack")
// TRAZ (CHAMA/IMPORTA): obsidian (App, Modal, Setting, Notice)
// CONTRATO (RESPOSTA ESPERADA):
//   Modal exibe: título da nota, seleção de modo (draft/publish), audiência
//   Aviso se nota já foi publicada (tem substack_url no frontmatter)
//   onConfirm callback chamado com { mode, audience } quando usuário confirma
// ==============================================================================

import { App, Modal, Notice, Setting } from "obsidian";
import type { TFile } from "obsidian";

/** Opções selecionadas pelo usuário no modal de publicação */
export interface PublishOptions {
	/** Modo de publicação */
	mode: "draft" | "publish";
	/** Audiência do post */
	audience: "everyone" | "only_paid" | "only_free";
}

/**
 * Modal de confirmação de publicação no Substack.
 * Exibe título, seleção de modo/audiência e aviso se já publicado.
 */
export class PublishModal extends Modal {
	private readonly file: TFile;
	private readonly onConfirm: (options: PublishOptions) => void;
	private readonly alreadyPublished: boolean;

	private selectedMode: "draft" | "publish" = "draft";
	private selectedAudience: "everyone" | "only_paid" | "only_free" = "only_paid";

	/**
	 * @param app - Instância do Obsidian App
	 * @param file - Arquivo a publicar
	 * @param onConfirm - Callback chamado quando o usuário confirma
	 * @param alreadyPublished - true se a nota já tem substack_url no frontmatter
	 */
	constructor(
		app: App,
		file: TFile,
		onConfirm: (options: PublishOptions) => void,
		alreadyPublished: boolean,
	) {
		super(app);
		this.file = file;
		this.onConfirm = onConfirm;
		this.alreadyPublished = alreadyPublished;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("sw-publish-modal");

		// Título do modal
		contentEl.createEl("h2", { text: "Publish to Substack" });

		// Título da nota
		contentEl.createEl("p", {
			text: `Note: ${this.file.basename}`,
			cls: "sw-publish-note-title",
		});

		// Aviso de nota já publicada
		if (this.alreadyPublished) {
			const warningEl = contentEl.createEl("div", { cls: "sw-publish-warning" });
			warningEl.createEl("span", { text: "⚠️ this note has been published before." });
		}

		// Seleção de modo
		new Setting(contentEl)
			.setName("Publish mode")
			.setDesc("Choose whether to create a draft or publish immediately.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("draft", "Draft")
					.addOption("publish", "Publish now")
					.setValue(this.selectedMode)
					.onChange((value) => {
						this.selectedMode = value as "draft" | "publish";
					});
			});

		// Seleção de audiência
		new Setting(contentEl)
			.setName("Audience")
			.setDesc("Who can see this entry.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("only_paid", "Paying subscribers only")
					.addOption("everyone", "Everyone (free)")
					.addOption("only_free", "Free subscribers only")
					.setValue(this.selectedAudience)
					.onChange((value) => {
						this.selectedAudience = value as "everyone" | "only_paid" | "only_free";
					});
			});

		// Botões
		const buttonContainer = contentEl.createEl("div", { cls: "sw-publish-buttons" });

		// Botão cancelar
		const cancelBtn = buttonContainer.createEl("button", {
			text: "Cancel",
			cls: "sw-btn-secondary",
		});
		cancelBtn.addEventListener("click", () => { this.close(); });

		// Botão confirmar
		const confirmBtn = buttonContainer.createEl("button", {
			text: this.selectedMode === "draft" ? "Save draft" : "Publish",
			cls: "sw-btn-primary mod-cta",
		});
		confirmBtn.addEventListener("click", () => {
			const settings = this.app.workspace.getLeavesOfType("").length;
			if (!settings && !this.alreadyPublished) {
				new Notice("Configure Substack settings before publishing.");
				return;
			}

			this.onConfirm({
				mode: this.selectedMode,
				audience: this.selectedAudience,
			});
			this.close();
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
