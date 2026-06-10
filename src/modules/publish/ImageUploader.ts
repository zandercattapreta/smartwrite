// ==============================================================================
// SCRIPT: ImageUploader.ts
// DESCRIÇÃO: Lê imagens locais do vault e faz upload para o CDN do Substack
// CHAMADO POR: main.ts (fluxo de publicação, entre MarkdownConverter e createDraft)
// TRAZ (CHAMA/IMPORTA): obsidian (App, TFile), SubstackClient, types.ts (ProseMirrorDoc)
// CONTRATO (RESPOSTA ESPERADA): processImages(doc, app) → ProseMirrorDoc
//   Percorre todos os nós type: "image" do doc
//   Para cada src local → lê via vault → converte base64 → POST /api/v1/image
//   Substitui src pelo URL CDN retornado
//   Falhas individuais de upload não param o processo (src mantido original)
// ==============================================================================

import type { App } from "obsidian";
import type { ProseMirrorDoc, ProseMirrorNode } from "../../types";
import type { SubstackClient } from "./SubstackClient";

/** MIME types suportados para upload de imagens */
const SUPPORTED_MIMES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
};

/** Regex para detectar imagem local wikilink: ![[nome.png]] */
const WIKILINK_REGEX = /^!\[\[(.+?)\]\]$/;

/** Regex para detectar imagem markdown local: ./caminho/img.png ou caminho/img.png */
const LOCAL_PATH_REGEX = /^(?:\.\/)?(?!https?:\/\/)/;

/**
 * Processa imagens em um ProseMirror doc:
 * faz upload das locais para o Substack CDN e substitui os srcs.
 */
export class ImageUploader {
	private readonly client: SubstackClient;

	/**
	 * @param client - SubstackClient configurado
	 */
	constructor(client: SubstackClient) {
		this.client = client;
	}

	/**
	 * Percorre todos os nós de imagem do doc e faz upload das imagens locais.
	 *
	 * @param doc - ProseMirror doc (objeto, antes de stringify)
	 * @param app - Instância do Obsidian App
	 * @returns doc com srcs locais substituídos por URLs CDN
	 */
	async processImages(doc: ProseMirrorDoc, app: App): Promise<ProseMirrorDoc> {
		// Clona o doc para não mutar o original
		const clonedDoc: ProseMirrorDoc = JSON.parse(JSON.stringify(doc)) as ProseMirrorDoc;
		await this.processNodes(clonedDoc.content, app);
		return clonedDoc;
	}

	// ---------------------------------------------------------------------------
	// Helpers privados
	// ---------------------------------------------------------------------------

	/** Percorre recursivamente os nós e processa imagens */
	private async processNodes(nodes: ProseMirrorNode[] | undefined, app: App): Promise<void> {
		if (!nodes) return;

		for (const node of nodes) {
			if (node.type === "image" && node.attrs) {
				const src = node.attrs.src as string | undefined;
				if (src && this.isLocalImage(src)) {
					const cdnUrl = await this.uploadLocalImage(src, app);
					if (cdnUrl) {
						node.attrs = { ...node.attrs, src: cdnUrl };
					}
				}
			}

			// Recursão nos filhos
			await this.processNodes(node.content, app);
		}
	}

	/**
	 * Verifica se um src é uma imagem local (wikilink ou path relativo).
	 */
	private isLocalImage(src: string): boolean {
		return WIKILINK_REGEX.test(src) || LOCAL_PATH_REGEX.test(src);
	}

	/**
	 * Faz upload de uma imagem local para o Substack.
	 *
	 * @param src - Caminho da imagem (wikilink ou path relativo)
	 * @param app - Instância do Obsidian App
	 * @returns URL CDN ou null se falhar
	 */
	private async uploadLocalImage(src: string, app: App): Promise<string | null> {
		try {
			// Resolve o path real da imagem no vault
			const filePath = this.resolvePath(src);
			const file = app.metadataCache.getFirstLinkpathDest(filePath, "");
			if (!file) return null;

			// Lê o arquivo binário
			const binary = await app.vault.readBinary(file);

			// Detecta o MIME type pela extensão
			const ext = file.extension.toLowerCase();
			const mimeType = SUPPORTED_MIMES[ext];
			if (!mimeType) return null;

			// Converte para base64
			const base64 = this.arrayBufferToBase64(binary);
			const dataUri = `data:${mimeType};base64,${base64}`;

			// POST para o Substack
			return await this.client.uploadImage(dataUri);
		} catch (error) {
			// Falha no upload não deve parar o processo de publicação
			console.debug("[SmartWrite] ImageUploader: falha no upload", src, error);
			return null;
		}
	}

	/**
	 * Resolve o path de um src (wikilink ou relativo) para um path de vault.
	 */
	private resolvePath(src: string): string {
		// Wikilink: ![[nome.png]] → "nome.png"
		const wikilinkMatch = WIKILINK_REGEX.exec(src);
		if (wikilinkMatch?.[1]) return wikilinkMatch[1];

		// Path relativo: ./caminho/img.png → "caminho/img.png"
		return src.replace(/^\.\//, "");
	}

	/**
	 * Converte um ArrayBuffer para string base64.
	 */
	private arrayBufferToBase64(buffer: ArrayBuffer): string {
		const bytes = new Uint8Array(buffer);
		let binary = "";
		for (const byte of bytes) {
			binary += String.fromCharCode(byte);
		}
		return btoa(binary);
	}
}
