// Stub de tipos para @codemirror/view (peer dep do Obsidian, não instalado localmente)
// Em runtime, este módulo é provido pelo bundle do Obsidian.
// Estes tipos são suficientes para o TypeScript resolver sem instalar o pacote.

import type { Extension, RangeSet } from "@codemirror/state";

declare module "@codemirror/view" {
	export interface ViewUpdate {
		docChanged: boolean;
		viewportChanged: boolean;
		view: EditorView;
	}

	export class EditorView {
		readonly state: import("@codemirror/state").EditorState;
	}

	export class Decoration {
		static mark(spec: { class?: string; [key: string]: unknown }): Decoration;
		static line(spec: { class?: string; [key: string]: unknown }): Decoration;
		static widget(spec: { widget: WidgetType; side?: number }): Decoration;
		startSide: number;
		endSide: number;
		mapMode: unknown;
		point: boolean;
		eq(other: Decoration): boolean;
	}

	export abstract class WidgetType {
		abstract toDOM(view: EditorView): HTMLElement;
	}

	export type DecorationSet = RangeSet<Decoration>;

	export interface PluginSpec {
		decorations?: (value: unknown) => DecorationSet;
		eventHandlers?: { [event: string]: (event: Event, view: EditorView) => boolean | void };
	}

	export interface PluginValue {
		update?(update: ViewUpdate): void;
		destroy?(): void;
	}

	export class ViewPlugin {
		static fromClass(
			cls: new (view: EditorView) => PluginValue,
			spec?: PluginSpec,
		): Extension;
	}
}
