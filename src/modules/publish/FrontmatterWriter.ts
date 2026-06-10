// ==============================================================================
// SCRIPT: FrontmatterWriter.ts
// DESCRIÇÃO: Adiciona substack_url e published_at ao frontmatter da nota após publicação
// CHAMADO POR: main.ts (após smartwrite:publish-complete)
// TRAZ (CHAMA/IMPORTA): obsidian (App, TFile)
// CONTRATO (RESPOSTA ESPERADA): write(file, url, publishedAt, app) → void
//   Usa app.fileManager.processFrontMatter() — API nativa do Obsidian
//   Nunca sobrescreve campos existentes além de substack_url e published_at
//   Se a nota já tiver substack_url → adiciona nova URL em array (não sobrescreve)
// ==============================================================================

import type { App, TFile } from "obsidian";

/**
 * Escreve metadados de publicação no frontmatter da nota.
 * Usa a API nativa do Obsidian para manipular o frontmatter de forma segura.
 */
export class FrontmatterWriter {
	/**
	 * Adiciona `substack_url` e `published_at` ao frontmatter da nota.
	 *
	 * Se a nota já tiver um `substack_url`, mantém o valor anterior e não sobrescreve.
	 * O campo `published_at` é sempre atualizado com a data da publicação mais recente.
	 *
	 * @param file - TFile da nota publicada
	 * @param url - URL do post no Substack
	 * @param publishedAt - Data de publicação em ISO 8601
	 * @param app - Instância do Obsidian App
	 */
	async write(file: TFile, url: string, publishedAt: string, app: App): Promise<void> {
		await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			// Mantém URL anterior se já existir (não sobrescreve publicações anteriores)
			if (!fm.substack_url) {
				fm.substack_url = url;
			}

			// Atualiza a data da publicação mais recente
			fm.published_at = publishedAt;
		});
	}
}
