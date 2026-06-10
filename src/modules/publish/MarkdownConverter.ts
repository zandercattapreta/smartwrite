// ==============================================================================
// SCRIPT: MarkdownConverter.ts
// DESCRIÇÃO: Converte Markdown → ProseMirror JSON stringificado (formato Substack)
// CHAMADO POR: main.ts (fluxo de publicação)
// TRAZ (CHAMA/IMPORTA): Nada — função pura, sem import de obsidian
// CONTRATO (RESPOSTA ESPERADA): toProseMirror(markdown) → string (JSON.stringify do doc)
//   Testável com vitest sem mocks.
//   draft_body é sempre uma string, nunca um objeto.
//   Mapeamento obrigatório definido em SETUPDEV_PUBLISH.md.
// ==============================================================================

import type { ProseMirrorDoc, ProseMirrorNode } from "../../types";

// ---------------------------------------------------------------------------
// Tipos auxiliares internos
// ---------------------------------------------------------------------------

/** Atributos de um nó de cabeçalho */
interface HeadingAttrs { level: number; textAlign: null; [key: string]: unknown }
/** Atributos de um nó de parágrafo */
interface ParagraphAttrs { textAlign: null; [key: string]: unknown }
/** Atributos de um link */
interface LinkAttrs { href: string; target: "_blank"; [key: string]: unknown }
/** Atributos de uma imagem */
interface ImageAttrs { src: string; alt: string; title: null; [key: string]: unknown }

// ---------------------------------------------------------------------------
// MarkdownConverter
// ---------------------------------------------------------------------------

/**
 * Converte Markdown puro para ProseMirror JSON stringificado no formato do Substack.
 *
 * Função pura: sem efeitos colaterais, sem imports de `obsidian`.
 * Testável diretamente com vitest.
 */
export class MarkdownConverter {
	/**
	 * Converte Markdown puro para a string JSON do ProseMirror doc.
	 *
	 * @param markdown - Conteúdo Markdown da nota Obsidian
	 * @returns string — resultado de JSON.stringify(proseMirrorDoc)
	 */
	toProseMirror(markdown: string): string {
		if (!markdown.trim()) {
			// Documento vazio válido (observado no HAR real)
			const emptyDoc: ProseMirrorDoc = {
				type: "doc",
				content: [{ type: "paragraph", attrs: { textAlign: null } }],
			};
			return JSON.stringify(emptyDoc);
		}

		const lines = markdown.split("\n");
		const content: ProseMirrorNode[] = [];

		let i = 0;
		while (i < lines.length) {
			const line = lines[i]!;

			// Linha em branco — pula
			if (!line.trim()) {
				i++;
				continue;
			}

			// Separador horizontal ---
			if (/^[-*_]{3,}\s*$/.test(line)) {
				content.push({ type: "horizontal_rule" });
				i++;
				continue;
			}

			// Headings H1–H6
			const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
			if (headingMatch) {
				const level = headingMatch[1]!.length;
				const text = headingMatch[2]!.trim();
				const attrs: HeadingAttrs = { level, textAlign: null };
				content.push({
					type: "heading",
					attrs,
					content: this.parseInline(text),
				});
				i++;
				continue;
			}

			// Lista não-ordenada (- item ou * item)
			if (/^[-*]\s+/.test(line)) {
				const listResult = this.parseList(lines, i, "bullet");
				content.push(listResult.node);
				i = listResult.nextIndex;
				continue;
			}

			// Lista ordenada (1. item)
			if (/^\d+\.\s+/.test(line)) {
				const listResult = this.parseList(lines, i, "ordered");
				content.push(listResult.node);
				i = listResult.nextIndex;
				continue;
			}

			// Imagem standalone ![alt](src)
			const imgMatch = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line.trim());
			if (imgMatch) {
				const alt = imgMatch[1]!;
				const src = imgMatch[2]!;
				const attrs: ImageAttrs = { src, alt, title: null };
				content.push({ type: "image", attrs });
				i++;
				continue;
			}

			// Parágrafo (tudo que não se encaixou acima)
			const paragraphLines: string[] = [];
			while (i < lines.length && lines[i]!.trim()) {
				// Para quando encontra outro bloco especial
				const l = lines[i]!;
				if (
					/^#{1,6}\s/.test(l) ||
					/^[-*_]{3,}\s*$/.test(l) ||
					/^[-*]\s+/.test(l) ||
					/^\d+\.\s+/.test(l)
				) {
					break;
				}
				paragraphLines.push(l);
				i++;
			}

			if (paragraphLines.length > 0) {
				const paragraphText = paragraphLines.join(" ");
				const attrs: ParagraphAttrs = { textAlign: null };
				content.push({
					type: "paragraph",
					attrs,
					content: this.parseInline(paragraphText),
				});
			}
		}

		// Garante que o documento nunca fique sem conteúdo
		if (content.length === 0) {
			const attrs: ParagraphAttrs = { textAlign: null };
			content.push({ type: "paragraph", attrs });
		}

		const doc: ProseMirrorDoc = { type: "doc", content };
		return JSON.stringify(doc);
	}

	// ---------------------------------------------------------------------------
	// Parsers de lista
	// ---------------------------------------------------------------------------

	private parseList(
		lines: string[],
		startIndex: number,
		listType: "bullet" | "ordered",
	): { node: ProseMirrorNode; nextIndex: number } {
		const listItems: ProseMirrorNode[] = [];
		let i = startIndex;

		const itemRegex = listType === "bullet" ? /^[-*]\s+(.+)$/ : /^\d+\.\s+(.+)$/;

		while (i < lines.length) {
			const line = lines[i]!;
			const match = itemRegex.exec(line);
			if (!match) break;

			const itemText = match[1]!;
			const attrs: ParagraphAttrs = { textAlign: null };
			listItems.push({
				type: "list_item",
				content: [
					{
						type: "paragraph",
						attrs,
						content: this.parseInline(itemText),
					},
				],
			});
			i++;
		}

		const nodeType = listType === "bullet" ? "bullet_list" : "ordered_list";
		return {
			node: { type: nodeType, content: listItems },
			nextIndex: i,
		};
	}

	// ---------------------------------------------------------------------------
	// Parser inline (bold, italic, code, links, images)
	// ---------------------------------------------------------------------------

	/**
	 * Converte texto com formatação inline em array de ProseMirrorNode.
	 * Processa: **bold**, *italic*, `code`, [link](url), ![img](url)
	 */
	private parseInline(text: string): ProseMirrorNode[] {
		const nodes: ProseMirrorNode[] = [];

		// Regex que captura os padrões inline em ordem de precedência
		const regex =
			/!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`/g;

		let lastIndex = 0;
		let match: RegExpExecArray | null;

		while ((match = regex.exec(text)) !== null) {
			// Texto antes do match
			if (match.index > lastIndex) {
				nodes.push({ type: "text", text: text.slice(lastIndex, match.index) });
			}

			if (match[1] !== undefined && match[2] !== undefined) {
				// Imagem inline ![alt](src)
				const attrs: ImageAttrs = { src: match[2], alt: match[1], title: null };
				nodes.push({ type: "image", attrs });
			} else if (match[3] !== undefined && match[4] !== undefined) {
				// Link [text](url)
				const attrs: LinkAttrs = { href: match[4], target: "_blank" };
				nodes.push({ type: "text", text: match[3], marks: [{ type: "link", attrs }] });
			} else if (match[5] !== undefined || match[6] !== undefined) {
				// Bold **text** ou __text__
				const content = (match[5] ?? match[6])!;
				nodes.push({ type: "text", text: content, marks: [{ type: "strong" }] });
			} else if (match[7] !== undefined || match[8] !== undefined) {
				// Italic *text* ou _text_
				const content = (match[7] ?? match[8])!;
				nodes.push({ type: "text", text: content, marks: [{ type: "em" }] });
			} else if (match[9] !== undefined) {
				// Code `text`
				nodes.push({ type: "text", text: match[9], marks: [{ type: "code" }] });
			}

			lastIndex = regex.lastIndex;
		}

		// Texto restante após o último match
		if (lastIndex < text.length) {
			nodes.push({ type: "text", text: text.slice(lastIndex) });
		}

		// Se não encontrou nada, retorna o texto puro
		if (nodes.length === 0) {
			nodes.push({ type: "text", text });
		}

		return nodes;
	}
}
