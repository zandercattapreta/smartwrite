// ==============================================================================
// TEST: MarkdownConverter.test.ts
// DESCRIÇÃO: Testes unitários do MarkdownConverter (Markdown → ProseMirror JSON)
// MÓDULO TESTADO: src/modules/publish/MarkdownConverter.ts
// ==============================================================================

import { describe, it, expect } from "vitest";
import { MarkdownConverter } from "../../src/modules/publish/MarkdownConverter";
import type { ProseMirrorDoc, ProseMirrorNode } from "../../src/types";

const converter = new MarkdownConverter();

// ---------------------------------------------------------------------------
// Helper para parsear a saída e obter o ProseMirrorDoc
// ---------------------------------------------------------------------------
function parse(markdown: string): ProseMirrorDoc {
	const json = converter.toProseMirror(markdown);
	return JSON.parse(json) as ProseMirrorDoc;
}

// ---------------------------------------------------------------------------
// Testes básicos
// ---------------------------------------------------------------------------

describe("toProseMirror — formato geral", () => {
	it("retorna JSON válido (JSON.parse não lança)", () => {
		const json = converter.toProseMirror("Texto de teste.");
		const parseJson = (): unknown => JSON.parse(json) as unknown;
		expect(parseJson).not.toThrow();
	});

	it("draft_body é string, não objeto", () => {
		const result = converter.toProseMirror("Texto.");
		expect(typeof result).toBe("string");
	});

	it("documento vazio retorna parágrafo vazio com textAlign: null", () => {
		const doc = parse("");
		expect(doc.type).toBe("doc");
		expect(doc.content).toHaveLength(1);
		expect(doc.content[0]!.type).toBe("paragraph");
		expect((doc.content[0]!.attrs as { textAlign: null }).textAlign).toBeNull();
	});

	it("texto em branco retorna parágrafo vazio", () => {
		const doc = parse("   ");
		expect(doc.content[0]!.type).toBe("paragraph");
	});

	it("doc tem type: 'doc'", () => {
		const doc = parse("Qualquer texto.");
		expect(doc.type).toBe("doc");
	});
});

// ---------------------------------------------------------------------------
// Parágrafo
// ---------------------------------------------------------------------------

describe("toProseMirror — parágrafo", () => {
	it("converte parágrafo simples", () => {
		const doc = parse("Texto de teste simples.");
		const para = doc.content[0]!;
		expect(para.type).toBe("paragraph");
		expect((para.attrs as { textAlign: null }).textAlign).toBeNull();
		const text = para.content?.[0] as ProseMirrorNode;
		expect(text?.type).toBe("text");
		expect(text?.text).toContain("Texto de teste simples");
	});
});

// ---------------------------------------------------------------------------
// Headings
// ---------------------------------------------------------------------------

describe("toProseMirror — headings", () => {
	it("converte heading H1", () => {
		const doc = parse("# Título Principal");
		const heading = doc.content[0]!;
		expect(heading.type).toBe("heading");
		expect((heading.attrs as { level: number }).level).toBe(1);
		expect((heading.attrs as { textAlign: null }).textAlign).toBeNull();
	});

	it("converte heading H2", () => {
		const doc = parse("## Subtítulo");
		const heading = doc.content[0]!;
		expect(heading.type).toBe("heading");
		expect((heading.attrs as { level: number }).level).toBe(2);
	});

	it("converte headings H1 e H2 em sequência", () => {
		const doc = parse("# H1\n## H2");
		expect(doc.content[0]!.type).toBe("heading");
		expect((doc.content[0]!.attrs as { level: number }).level).toBe(1);
		expect(doc.content[1]!.type).toBe("heading");
		expect((doc.content[1]!.attrs as { level: number }).level).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// Inline: bold e italic
// ---------------------------------------------------------------------------

describe("toProseMirror — formatação inline", () => {
	it("converte bold **text**", () => {
		const doc = parse("Texto **negrito** aqui.");
		const para = doc.content[0]!;
		const boldNode = para.content?.find(
			n => n.marks?.some(m => m.type === "strong"),
		);
		expect(boldNode).toBeDefined();
		expect(boldNode?.text).toBe("negrito");
	});

	it("converte italic *text*", () => {
		const doc = parse("Texto *itálico* aqui.");
		const para = doc.content[0]!;
		const italicNode = para.content?.find(
			n => n.marks?.some(m => m.type === "em"),
		);
		expect(italicNode).toBeDefined();
	});

	it("converte bold e italic em conjunto", () => {
		const doc = parse("**bold** e *italic*.");
		const para = doc.content[0]!;
		const hasBold = para.content?.some(n => n.marks?.some(m => m.type === "strong"));
		const hasItalic = para.content?.some(n => n.marks?.some(m => m.type === "em"));
		expect(hasBold).toBe(true);
		expect(hasItalic).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Lista não-ordenada
// ---------------------------------------------------------------------------

describe("toProseMirror — lista não-ordenada", () => {
	it("converte lista com traço", () => {
		const doc = parse("- Item um\n- Item dois\n- Item três");
		const list = doc.content[0]!;
		expect(list.type).toBe("bullet_list");
		expect(list.content).toHaveLength(3);
	});

	it("cada item é list_item com paragraph", () => {
		const doc = parse("- Único item");
		const listContent = doc.content[0]?.content ?? [];
		const listItem = listContent[0];
		expect(listItem?.type).toBe("list_item");
		const itemContent = listItem?.content ?? [];
		expect(itemContent[0]?.type).toBe("paragraph");
	});
});

// ---------------------------------------------------------------------------
// Lista ordenada
// ---------------------------------------------------------------------------

describe("toProseMirror — lista ordenada", () => {
	it("converte lista ordenada", () => {
		const doc = parse("1. Primeiro\n2. Segundo\n3. Terceiro");
		const list = doc.content[0]!;
		expect(list.type).toBe("ordered_list");
		expect(list.content).toHaveLength(3);
	});
});

// ---------------------------------------------------------------------------
// Link
// ---------------------------------------------------------------------------

describe("toProseMirror — links", () => {
	it("converte link com href", () => {
		const doc = parse("[texto do link](https://exemplo.com)");
		const para = doc.content[0]!;
		const linkNode = para.content?.find(
			n => n.marks?.some(m => m.type === "link"),
		);
		expect(linkNode).toBeDefined();
		expect(linkNode?.text).toBe("texto do link");

		const linkMark = linkNode?.marks?.find(m => m.type === "link");
		const linkAttrs = linkMark?.attrs as { href: string; target: string } | undefined;
		expect(linkAttrs?.href).toBe("https://exemplo.com");
		expect(linkAttrs?.target).toBe("_blank");
	});
});

// ---------------------------------------------------------------------------
// Separador horizontal
// ---------------------------------------------------------------------------

describe("toProseMirror — separador", () => {
	it("converte separador ---", () => {
		const doc = parse("---");
		expect(doc.content[0]!.type).toBe("horizontal_rule");
	});
});
