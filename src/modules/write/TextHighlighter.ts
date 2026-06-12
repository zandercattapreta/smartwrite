// ==============================================================================
// SCRIPT: TextHighlighter.ts
// DESCRIÇÃO: CodeMirror 6 Extension para realce inline de frases longas e palavras repetidas
// CHAMADO POR: main.ts (this.registerEditorExtension)
// TRAZ (CHAMA/IMPORTA): @codemirror/view, @codemirror/state (via stubs em src/*.d.ts),
//   types.ts (SmartWriteSettings), StatsCalculator.ts
// CONTRATO (RESPOSTA ESPERADA): Exporta buildHighlightExtension() — retorna Extension
//   do CodeMirror 6 registrada via this.registerEditorExtension().
//   Usa ViewPlugin + Decoration pattern. Nunca manipula o DOM diretamente.
//
// NOTA TÉCNICA: @codemirror/view e @codemirror/state são peerDependencies do Obsidian
//   (declarados como externals no esbuild.config.mjs e resolvidos pelo runtime do
//   Obsidian em produção). Os tipos são resolvidos localmente via src/codemirror-*.d.ts.
// ==============================================================================

import { Decoration, ViewPlugin } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import type { DecorationSet, EditorView, ViewUpdate } from "@codemirror/view";
import type { Extension } from "@codemirror/state";
import type { SmartWriteSettings } from "../../types";
import { StatsCalculator } from "./StatsCalculator";

// ---------------------------------------------------------------------------
// Classes CSS — aplicadas via Decoration.mark — definidas em styles.css
// ---------------------------------------------------------------------------
const CSS_LONG_SENTENCE = "sw-long-sentence";
const CSS_REPEATED_WORD = "sw-repeated-word";

// ---------------------------------------------------------------------------
// buildHighlightExtension
// ---------------------------------------------------------------------------

/**
 * Constrói uma CodeMirror 6 Extension que aplica realces inline ao editor.
 * Deve ser registrada via this.registerEditorExtension() no main.ts.
 *
 * O realce acontece a cada mudança de documento (ViewUpdate).
 * Usa RangeSetBuilder para construir Decorations em ordem crescente de posição.
 *
 * @param settings - Configurações do plugin (controla o que realçar)
 * @returns Extension do CodeMirror 6
 */
export function buildHighlightExtension(settings: SmartWriteSettings): Extension {
	const calculator = new StatsCalculator();

	// Decorações estáticas (instanciadas uma vez, reutilizadas por performance)
	const longSentenceMark = Decoration.mark({ class: CSS_LONG_SENTENCE });
	const repeatedWordMark = Decoration.mark({ class: CSS_REPEATED_WORD });

	/**
	 * Constrói o DecorationSet para uma EditorView específica.
	 * Chamado no construtor da ViewPlugin e em cada update relevante.
	 *
	 * @param view - EditorView do CodeMirror 6 com o documento atual
	 */
	function buildDecorations(view: EditorView): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();
		const text: string = view.state.doc.toString();

		// Coleta todos os spans com decorações correspondentes
		const spans: Array<{ from: number; to: number; dec: Decoration }> = [];

		// Realce de frases longas (se habilitado nas settings)
		if (settings.highlightLongSentences) {
			const longSpans = calculator.findLongSentences(text, settings.longSentenceThreshold);
			for (const span of longSpans) {
				spans.push({ from: span.from, to: span.to, dec: longSentenceMark });
			}
		}

		// Realce de palavras repetidas (se habilitado nas settings)
		if (settings.highlightFrequentWords) {
			const repeatedSpans = calculator.findRepeatedWords(text);
			for (const span of repeatedSpans) {
				spans.push({ from: span.from, to: span.to, dec: repeatedWordMark });
			}
		}

		// Ordena por posição de início (obrigatório para RangeSetBuilder)
		spans.sort((a, b) => a.from - b.from || a.to - b.to);

		// Adiciona decorações ao builder, verificando limites do documento
		const docLength = text.length;
		for (const { from, to, dec } of spans) {
			if (from >= 0 && to <= docLength && from < to) {
				builder.add(from, to, dec);
			}
		}

		return builder.finish();
	}

	return ViewPlugin.fromClass(
		class {
			decorations: DecorationSet;

			constructor(view: EditorView) {
				this.decorations = buildDecorations(view);
			}

			update(update: ViewUpdate): void {
				// Recalcula apenas quando o documento ou viewport mudam
				if (update.docChanged || update.viewportChanged) {
					this.decorations = buildDecorations(update.view);
				}
			}
		},
		{
			// Expõe as decorações ao EditorView para renderização
			decorations: (v: unknown) => (v as { decorations: DecorationSet }).decorations,
		},
	);
}
