// ==============================================================================
// SCRIPT: PersonaRunner.ts
// DESCRIÇÃO: Executa uma persona (OllamaClient + parse JSON) → FeedbackResult[]
// CHAMADO POR: AnalysisQueue
// TRAZ (CHAMA/IMPORTA): OllamaClient, types.ts (FeedbackResult, PersonaDefinition)
// CONTRATO (RESPOSTA ESPERADA): run() → FeedbackResult[] (vazio se parse falhar)
//   Nunca propaga exceção — toda falha retorna [] com log de debug.
//   O parse da resposta do Ollama nunca lança para o usuário.
// ==============================================================================

import type { FeedbackResult, PersonaDefinition, FeedbackItem } from "../../types";
import type { OllamaClient } from "./OllamaClient";

/** Executa uma persona contra um texto e retorna os resultados de feedback */
export class PersonaRunner {
	private readonly client: OllamaClient;

	/**
	 * @param client - OllamaClient configurado com o endpoint correto
	 */
	constructor(client: OllamaClient) {
		this.client = client;
	}

	/**
	 * Executa a persona contra o texto fornecido.
	 *
	 * Fluxo:
	 * 1. Monta prompt: systemPrompt + "\n\nTexto:\n" + text
	 * 2. Chama OllamaClient.generate()
	 * 3. Faz parse da resposta JSON → FeedbackItem[]
	 * 4. Converte para FeedbackResult[] adicionando personaId e timestamp
	 * 5. Retorna [] se qualquer etapa falhar — NUNCA propaga exceção
	 *
	 * @param text - Texto a analisar
	 * @param persona - Definição da persona (incluindo systemPrompt)
	 * @param model - Nome do modelo Ollama (ex: "qwen2.5")
	 * @returns Array de FeedbackResult (vazio se Ollama falhar ou parse falhar)
	 */
	async run(text: string, persona: PersonaDefinition, model: string): Promise<FeedbackResult[]> {
		if (!text.trim()) return [];

		try {
			const rawResponse = await this.client.generate({
				model,
				system: persona.systemPrompt,
				prompt: `Texto:\n${text}`,
				stream: false,
			});

			return this.parseResponse(rawResponse, persona.id);
		} catch (error) {
			// Log de debug — nunca propaga
			console.debug("[SmartWrite] PersonaRunner: falha ao executar persona", persona.id, error);
			return [];
		}
	}

	/**
	 * Faz parse da resposta do Ollama como JSON → FeedbackResult[].
	 * Tenta extrair o primeiro array JSON válido da resposta (o Ollama pode incluir
	 * texto antes ou depois do JSON).
	 *
	 * @param raw - Resposta bruta do Ollama
	 * @param personaId - ID da persona para incluir nos resultados
	 * @returns Array de FeedbackResult (vazio se parse falhar)
	 */
	private parseResponse(raw: string, personaId: string): FeedbackResult[] {
		try {
			// Extrai o primeiro bloco JSON array da resposta (pode haver texto extra)
			const jsonMatch = /(\[[\s\S]*\])/.exec(raw);
			if (!jsonMatch?.[1]) return [];

			const parsed = JSON.parse(jsonMatch[1]) as unknown;
			if (!Array.isArray(parsed)) return [];

			const timestamp = Date.now();

			// Filtra e valida cada item do array
			const results: FeedbackResult[] = [];
			for (const item of parsed) {
				if (!this.isValidFeedbackItem(item)) continue;
				results.push({
					personaId,
					excerpt: item.excerpt,
					issue: item.issue,
					severity: item.severity,
					timestamp,
				});
			}

			return results;
		} catch (error) {
			// Se o JSON não for válido → retorna [] silenciosamente
			console.debug("[SmartWrite] PersonaRunner: parse JSON falhou", error);
			return [];
		}
	}

	/**
	 * Type guard para validar um item de feedback da resposta do Ollama.
	 *
	 * @param item - Valor a validar
	 * @returns true se o item for um FeedbackItem válido
	 */
	private isValidFeedbackItem(item: unknown): item is FeedbackItem {
		if (typeof item !== "object" || item === null) return false;
		const obj = item as Record<string, unknown>;
		return (
			typeof obj.excerpt === "string" &&
			typeof obj.issue === "string" &&
			(obj.severity === "low" || obj.severity === "medium" || obj.severity === "high")
		);
	}
}
