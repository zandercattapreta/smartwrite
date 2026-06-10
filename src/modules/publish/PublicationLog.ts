// ==============================================================================
// SCRIPT: PublicationLog.ts
// DESCRIÇÃO: Log append-only de publicações (smartwrite-log.json no vault)
// CHAMADO POR: main.ts (após smartwrite:publish-complete)
// TRAZ (CHAMA/IMPORTA): obsidian (App), types.ts (PublicationEntry)
// CONTRATO (RESPOSTA ESPERADA):
//   append(entry, app) → void — adiciona entrada ao log (nunca reescreve anteriores)
//   readAll(app) → PublicationEntry[] — lê todas as entradas
//   AVISO: Não sincronizar smartwrite-log.json via Git/iCloud (contém URLs privadas)
// ==============================================================================

import type { App } from "obsidian";
import type { PublicationEntry } from "../../types";

/** Caminho padrão do arquivo de log (relativo à raiz do vault) */
export const DEFAULT_LOG_PATH = "smartwrite-log.json";

/**
 * Log persistente append-only de publicações realizadas.
 * Salvo em smartwrite-log.json na raiz do vault.
 * AVISO: Não sincronize este arquivo via Git/iCloud — contém URLs privadas.
 */
export class PublicationLog {
	private readonly logPath: string;

	/**
	 * @param logPath - Caminho do arquivo de log no vault (padrão: "smartwrite-log.json")
	 */
	constructor(logPath: string = DEFAULT_LOG_PATH) {
		this.logPath = logPath;
	}

	/**
	 * Adiciona uma entrada ao log de publicações.
	 * Nunca reescreve entradas existentes — apenas acrescenta.
	 *
	 * @param entry - Dados da publicação (veja PublicationEntry em types.ts)
	 * @param app - Instância do Obsidian App
	 */
	async append(entry: PublicationEntry, app: App): Promise<void> {
		const existing = await this.readAll(app);
		existing.push(entry);
		await this.write(existing, app);
	}

	/**
	 * Lê todas as entradas do log.
	 * Retorna array vazio se o arquivo não existir ou for inválido.
	 *
	 * @param app - Instância do Obsidian App
	 * @returns Array de PublicationEntry
	 */
	async readAll(app: App): Promise<PublicationEntry[]> {
		try {
			const file = app.vault.getAbstractFileByPath(this.logPath);
			if (!file) return [];

			const content = await app.vault.read(file as Parameters<typeof app.vault.read>[0]);
			const parsed = JSON.parse(content) as unknown;

			if (!Array.isArray(parsed)) return [];

			// Valida e filtra entradas malformadas
			return parsed.filter((item): item is PublicationEntry => this.isValidEntry(item));
		} catch {
			// Arquivo inexistente ou JSON inválido → retorna vazio
			return [];
		}
	}

	// ---------------------------------------------------------------------------
	// Helpers privados
	// ---------------------------------------------------------------------------

	/**
	 * Escreve o array completo de entradas no arquivo de log.
	 * Cria o arquivo se não existir.
	 */
	private async write(entries: PublicationEntry[], app: App): Promise<void> {
		const content = JSON.stringify(entries, null, 2);
		const existing = app.vault.getAbstractFileByPath(this.logPath);

		if (existing) {
			await app.vault.modify(existing as Parameters<typeof app.vault.modify>[0], content);
		} else {
			await app.vault.create(this.logPath, content);
		}
	}

	/**
	 * Type guard para validar entradas do log.
	 */
	private isValidEntry(item: unknown): item is PublicationEntry {
		if (typeof item !== "object" || item === null) return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.filePath === "string" &&
			typeof obj.substackUrl === "string" &&
			typeof obj.publishedAt === "string" &&
			(obj.mode === "draft" || obj.mode === "publish" || obj.mode === "scheduled")
		);
	}
}
