// ==============================================================================
// SCRIPT: OllamaClient.ts
// DESCRIÇÃO: HTTP client para o Ollama local. POST /api/generate. requestUrl nativo.
// CHAMADO POR: PersonaRunner
// TRAZ (CHAMA/IMPORTA): obsidian (requestUrl), types.ts (OllamaRequest)
// CONTRATO (RESPOSTA ESPERADA): generate() → string (resposta da IA)
//   checkHealth() → boolean (true se Ollama responder 200 em /api/version)
//   Timeout: 60s para generate, 5s para health check.
//   Usa requestUrl do Obsidian (evita CORS, necessário para chamar localhost).
// ==============================================================================

import { requestUrl } from "obsidian";
import type { RequestUrlParam } from "obsidian";
import type { OllamaRequest } from "../../types";

// Timeout em ms para chamadas de geração
const GENERATE_TIMEOUT_MS = 60_000;
// Timeout em ms para health check
const HEALTH_TIMEOUT_MS = 5_000;

/** Client HTTP para comunicação com o Ollama rodando localmente */
export class OllamaClient {
	/** URL base do servidor Ollama (ex: http://localhost:11434) */
	private readonly baseUrl: string;

	/**
	 * @param baseUrl - URL base do servidor Ollama (das settings)
	 */
	constructor(baseUrl: string) {
		// Remove trailing slash para evitar double-slash nas URLs
		this.baseUrl = baseUrl.replace(/\/$/, "");
	}

	/**
	 * Envia um prompt para o Ollama e retorna a resposta completa como string.
	 * Usa stream: false para receber a resposta completa de uma vez (MVP).
	 *
	 * @param request - Parâmetros da requisição (model, prompt, system)
	 * @returns Resposta completa do modelo como string
	 * @throws Error se o Ollama não responder dentro de 60s ou retornar erro HTTP
	 */
	async generate(request: OllamaRequest): Promise<string> {
		const url = `${this.baseUrl}/api/generate`;

		const params: RequestUrlParam = {
			url,
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ ...request, stream: false }),
			throw: false,
		};

		// Timeout via Promise.race
		const timeoutPromise = new Promise<never>((_, reject) => {
			window.setTimeout(() => { reject(new Error("Ollama timeout")); }, GENERATE_TIMEOUT_MS);
		});

		const responsePromise = requestUrl(params);
		const response = await Promise.race([responsePromise, timeoutPromise]);

		if (!response.status || response.status >= 400) {
			throw new Error(`Ollama returned HTTP ${response.status}`);
		}

		const data = response.json as { response: string };
		return data.response ?? "";
	}

	/**
	 * Verifica se o Ollama está rodando e acessível.
	 * Faz GET /api/version — retorna true se o status for 200.
	 *
	 * @returns true se Ollama estiver rodando, false caso contrário
	 */
	async checkHealth(): Promise<boolean> {
		const url = `${this.baseUrl}/api/version`;

		try {
			const timeoutPromise = new Promise<never>((_, reject) => {
				window.setTimeout(() => { reject(new Error("Health check timeout")); }, HEALTH_TIMEOUT_MS);
			});

			const params: RequestUrlParam = { url, method: "GET", throw: false };
			const responsePromise = requestUrl(params);
			const response = await Promise.race([responsePromise, timeoutPromise]);

			return response.status === 200;
		} catch {
			return false;
		}
	}
}
