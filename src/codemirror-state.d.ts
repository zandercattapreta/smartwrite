// Stub de tipos para @codemirror/state (peer dep do Obsidian, não instalado localmente)
// Em runtime, este módulo é provido pelo bundle do Obsidian.
// Estes tipos são suficientes para o TypeScript resolver sem instalar o pacote.

declare module "@codemirror/state" {
	export interface Transaction {
		docChanged: boolean;
	}

	export class RangeSetBuilder<T extends RangeValue> {
		add(from: number, to: number, value: T): void;
		finish(): RangeSet<T>;
	}

	export interface RangeValue {
		startSide?: number;
		endSide?: number;
		mapMode?: unknown;
		point?: boolean;
		eq(other: RangeValue): boolean;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export class RangeSet<_T extends RangeValue> {
		static empty: RangeSet<RangeValue>;
	}

	/** Opaque type for CodeMirror extension — do not implement directly */
	// eslint-disable-next-line @typescript-eslint/no-empty-object-type
	export interface Extension {}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export class StateField<_T> {
		static define<T>(config: { create(state: EditorState): T; update(value: T, tr: Transaction): T }): StateField<T>;
	}

	export class EditorState {
		readonly doc: Text;
	}

	export class Text {
		toString(): string;
		readonly length: number;
	}
}
