// ==============================================================================
// SCRIPT: PersonaLoader.ts
// DESCRIÇÃO: Carrega definição de persona — vault (prioridade) ou bundled (fallback)
// CHAMADO POR: AnalysisQueue, FeedbackView (via PersonaRunner)
// TRAZ (CHAMA/IMPORTA): personas/* (bundled prompts), types.ts
// CONTRATO (RESPOSTA ESPERADA): load(personaId, app, settings) → PersonaDefinition
//   Se vaultPath configurado e arquivo existe → usa vault
//   Caso contrário → usa persona bundled
//   Nunca lança exceção — fallback sempre para bundled
//   NÃO importa de 'obsidian' — usa duck typing para App para ser testável.
// ==============================================================================

import type { SmartWriteSettings, PersonaDefinition } from "../../types";
import { normalizePath } from "obsidian";
import { COMMON_READER_PROMPT } from "../../personas/common-reader";
import { CRITICAL_EDITOR_PROMPT } from "../../personas/critical-editor";

// ---------------------------------------------------------------------------
// Duck type para App (compatível com Obsidian App, mas sem import de 'obsidian')
// ---------------------------------------------------------------------------

/** Interface mínima do Obsidian App usada pelo PersonaLoader */
interface VaultReadable {
	vault: {
		getAbstractFileByPath(path: string): unknown;
		read(file: object): Promise<string>;
	};
}

// ---------------------------------------------------------------------------
// Personas bundled — disponíveis sem configuração
// ---------------------------------------------------------------------------

/** Mapa de personas disponíveis embutidas no bundle */
const BUNDLED_PERSONAS: Record<string, PersonaDefinition> = {
	"common-reader": {
		id: "common-reader",
		nome: "Common reader",
		systemPrompt: COMMON_READER_PROMPT,
		source: "bundled",
	},
	"critical-editor": {
		id: "critical-editor",
		nome: "Critical editor",
		systemPrompt: CRITICAL_EDITOR_PROMPT,
		source: "bundled",
	},
};

/** Persona padrão quando nada mais está disponível */
const FALLBACK_PERSONA: PersonaDefinition = BUNDLED_PERSONAS["common-reader"]!;

// ---------------------------------------------------------------------------
// PersonaLoader
// ---------------------------------------------------------------------------

/**
 * Carrega a definição de uma persona a partir do vault ou das bundled.
 * Prioridade: vault → bundled → fallback hardcoded.
 * Não importa de 'obsidian' — usa duck typing para ser testável com vitest.
 */
export class PersonaLoader {
	/**
	 * Carrega uma persona pelo seu ID.
	 *
	 * Se `settings.personasVaultPath` estiver preenchido, tenta ler o arquivo
	 * `<vaultPath>/<personaId>.md` via `app.vault.read()` e fazer parse do frontmatter.
	 * Se falhar por qualquer motivo, usa a persona bundled correspondente.
	 * Se a persona bundled também não existir, retorna o fallback (common-reader).
	 *
	 * @param personaId - ID da persona (ex: "common-reader")
	 * @param app - Objeto com vault (compatível com Obsidian App)
	 * @param settings - Configurações do plugin
	 * @returns PersonaDefinition carregada (nunca throws)
	 */
	async load(personaId: string, app: VaultReadable, settings: SmartWriteSettings): Promise<PersonaDefinition> {
		// Tenta carregar do vault se o path estiver configurado
		if (settings.personasVaultPath.trim()) {
			const vaultPersona = await this.loadFromVault(personaId, app, settings.personasVaultPath);
			if (vaultPersona) {
				return vaultPersona;
			}
		}

		// Fallback para persona bundled
		return BUNDLED_PERSONAS[personaId] ?? FALLBACK_PERSONA;
	}

	/**
	 * Tenta carregar uma persona a partir de um arquivo Markdown no vault.
	 * Retorna null se o arquivo não existir ou o parse falhar.
	 *
	 * Formato esperado no vault:
	 * ```markdown
	 * ---
	 * id: common-reader
	 * nome: Common Reader
	 * ---
	 *
	 * ## Prompt do sistema
	 *
	 * ```text
	 * [conteúdo do system prompt]
	 * ```
	 * ```
	 *
	 * @param personaId - ID da persona
	 * @param app - Objeto com vault
	 * @param vaultPath - Caminho relativo no vault para a pasta de personas
	 * @returns PersonaDefinition ou null
	 */
	private async loadFromVault(
		personaId: string,
		app: VaultReadable,
		vaultPath: string,
	): Promise<PersonaDefinition | null> {
		try {
		const filePath = normalizePath(`${vaultPath}/${personaId}.md`);
			const abstractFile = app.vault.getAbstractFileByPath(filePath);

			if (!abstractFile) return null;

			// Lê o conteúdo do arquivo de persona
			const content = await app.vault.read(abstractFile as object);

			// Parse do frontmatter (entre os primeiros ---)
			const frontmatterMatch = /^---\n([\s\S]*?)\n---/.exec(content);
			if (!frontmatterMatch?.[1]) return null;

			const frontmatter = this.parseSimpleYaml(frontmatterMatch[1]);

			// Extrai o system prompt do bloco após "## Prompt do sistema"
			const promptMatch = /##\s+Prompt do sistema\s*\n+```(?:text)?\n([\s\S]*?)```/m.exec(content);
			if (!promptMatch?.[1]) return null;

			const systemPrompt = promptMatch[1].trim();

			return {
				id: typeof frontmatter.id === "string" ? frontmatter.id : personaId,
				nome: typeof frontmatter.nome === "string" ? frontmatter.nome : personaId,
				systemPrompt,
				source: "vault",
			};
		} catch {
			// Qualquer erro de leitura ou parse → fallback silencioso
			return null;
		}
	}

	/**
	 * Parser mínimo de YAML para frontmatter simples (key: value).
	 * Não usa parseYaml do Obsidian para manter testabilidade sem mocks do runtime.
	 * Suporta apenas scalars (string, número) — não suporta listas ou objetos aninhados.
	 *
	 * @param yaml - Conteúdo do bloco frontmatter (sem os delimitadores ---)
	 * @returns Objeto com pares chave-valor
	 */
	private parseSimpleYaml(yaml: string): Record<string, string> {
		const result: Record<string, string> = {};
		const lines = yaml.split("\n");
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
}
