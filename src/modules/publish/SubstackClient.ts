// ==============================================================================
// SCRIPT: SubstackClient.ts
// DESCRIÇÃO: HTTP client para a API do Substack. Usa requestUrl() do Obsidian (evita CORS).
// CHAMADO POR: main.ts (fluxo de publicação), ImageUploader, PublishModal
// TRAZ (CHAMA/IMPORTA): obsidian (Notice, requestUrl), types.ts (DraftPayload)
// CONTRATO (RESPOSTA ESPERADA):
//   getUserId() → number
//   createDraft(payload) → number (draftId)
//   publishDraft(draftId) → string (URL do post)
//   uploadImage(dataUri) → string (URL CDN)
//   Tratamento obrigatório: 401 → Notice cookie expirado, 403 → Notice sem permissão
// ==============================================================================

import { Notice, requestUrl } from "obsidian";
import type { RequestUrlParam } from "obsidian";
import type { DraftPayload } from "../../types";

// Timeout para requests ao Substack
const REQUEST_TIMEOUT_MS = 30_000;

/** Client HTTP para a API do Substack */
export class SubstackClient {
	/** URL base da publicação (ex: https://casadozander.substack.com) */
	private readonly baseUrl: string;
	/** Cookie de autenticação (connect.sid ou substack.sid) */
	private readonly cookie: string;

	/**
	 * @param subdomain - Subdomínio da publicação (ex: "casadozander")
	 * @param cookie - Cookie de autenticação (connect.sid value)
	 */
	constructor(subdomain: string, cookie: string) {
		this.baseUrl = `https://${subdomain}.substack.com`;
		this.cookie = cookie;
	}

	// ---------------------------------------------------------------------------
	// Endpoints públicos
	// ---------------------------------------------------------------------------

	/**
	 * Obtém o ID numérico do usuário autenticado.
	 * GET /api/v1/user/self
	 *
	 * @returns ID numérico do usuário
	 */
	async getUserId(): Promise<number> {
		const data = await this.get<{ id: number }>("/api/v1/user/self");
		return data.id;
	}

	/**
	 * Cria um draft no Substack.
	 * POST /api/v1/drafts
	 *
	 * @param payload - Dados do draft (título, corpo, audiência etc.)
	 * @returns ID do draft criado
	 */
	async createDraft(payload: DraftPayload): Promise<number> {
		const data = await this.post<{ id: number }>("/api/v1/drafts", payload);
		return data.id;
	}

	/**
	 * Publica um draft existente.
	 * POST /api/v1/drafts/{draftId}/publish
	 *
	 * @param draftId - ID do draft a publicar
	 * @returns URL do post publicado
	 */
	async publishDraft(draftId: number): Promise<string> {
		await this.post<unknown>(`/api/v1/drafts/${draftId}/publish`, { send: true });
		return `${this.baseUrl}/p/${draftId}`;
	}

	/**
	 * Faz upload de uma imagem para o CDN do Substack.
	 * POST /api/v1/image
	 *
	 * @param dataUri - Data URI da imagem (ex: "data:image/png;base64,...")
	 * @returns URL da imagem no CDN
	 */
	async uploadImage(dataUri: string): Promise<string> {
		const data = await this.post<{ url: string }>("/api/v1/image", { image: dataUri });
		return data.url;
	}

	// ---------------------------------------------------------------------------
	// Helpers HTTP
	// ---------------------------------------------------------------------------

	/** Headers obrigatórios em todos os requests */
	private buildHeaders(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			"Cookie": `connect.sid=${this.cookie}`,
			"Origin": this.baseUrl,
			"Referer": `${this.baseUrl}/`,
			"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
		};
	}

	/**
	 * Executa um GET request e retorna o JSON tipado.
	 * Trata erros HTTP com mensagens amigáveis via Notice.
	 */
	private async get<T>(path: string): Promise<T> {
		const params: RequestUrlParam = {
			url: `${this.baseUrl}${path}`,
			method: "GET",
			headers: this.buildHeaders(),
			throw: false,
		};

		const response = await requestUrl(params);
		this.handleError(response.status);

		return response.json as T;
	}

	/**
	 * Executa um POST request com body JSON e retorna o JSON tipado.
	 * Trata erros HTTP com mensagens amigáveis via Notice.
	 */
	private async post<T>(path: string, body: unknown): Promise<T> {
		const params: RequestUrlParam = {
			url: `${this.baseUrl}${path}`,
			method: "POST",
			headers: this.buildHeaders(),
			body: JSON.stringify(body),
			throw: false,
		};

		// Timeout manual via AbortController não disponível em requestUrl do Obsidian
		// O timeout é implementado via race de Promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			window.setTimeout(() => { reject(new Error("Request timeout")); }, REQUEST_TIMEOUT_MS);
		});

		const responsePromise = requestUrl(params);
		const response = await Promise.race([responsePromise, timeoutPromise]);

		this.handleError(response.status);

		return response.json as T;
	}

	/**
	 * Verifica o status HTTP e exibe Notice para erros comuns.
	 * Lança erro para interromper o fluxo em caso de falha.
	 */
	private handleError(status: number): void {
		if (status === 401) {
			new Notice("Cookie expirado. Atualize o Substack.sid nas settings.");
			throw new Error("HTTP 401 Unauthorized");
		}
		if (status === 403) {
			new Notice("Sem permissão. Verifique se o cookie pertence a esta publicação.");
			throw new Error("HTTP 403 Forbidden");
		}
		if (status >= 400) {
			new Notice(`Substack retornou erro ${status}. Tente novamente.`);
			throw new Error(`HTTP ${status}`);
		}
	}
}
