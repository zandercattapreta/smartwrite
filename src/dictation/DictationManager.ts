import { Editor, Notice } from "obsidian";
import { AudioRecorder }  from "./AudioRecorder";
import { WhisperRunner }  from "./WhisperRunner";
import { SmartWriteSettings } from "../settings/SmartWriteSettings";

export type DictationState = "idle" | "recording" | "transcribing";

export type StateChangeCallback = (state: DictationState) => void;

export class DictationManager {
	private recorder = new AudioRecorder();
	private state: DictationState = "idle";
	private onStateChange: StateChangeCallback;

	constructor(
		private settings: SmartWriteSettings,
		onStateChange: StateChangeCallback,
	) {
		this.onStateChange = onStateChange;
	}

	get currentState(): DictationState {
		return this.state;
	}

	/** Toggle recording. Starts if idle, stops + transcribes if recording. */
	async toggle(editor?: Editor): Promise<void> {
		if (this.state === "idle") {
			await this.startRecording();
		} else if (this.state === "recording") {
			await this.stopAndTranscribe(editor);
		}
		// If already transcribing, ignore.
	}

	async startRecording(): Promise<void> {
		try {
			await this.recorder.start();
			this.setState("recording");
		} catch (err) {
			new Notice(`❌ SmartWrite: Não foi possível acessar o microfone.\n${(err as Error).message}`);
			this.setState("idle");
		}
	}

	async stopAndTranscribe(editor?: Editor): Promise<void> {
		this.setState("transcribing");

		let wavBuffer: Buffer;

		try {
			wavBuffer = await this.recorder.stop();
		} catch (err) {
			new Notice(`❌ SmartWrite: Erro ao processar o áudio.\n${(err as Error).message}`);
			this.setState("idle");
			return;
		}

		const runner = new WhisperRunner({
			cliPath:   this.settings.whisperCliPath,
			model:     this.settings.whisperModel,
			modelsDir: this.settings.whisperModelsDir || undefined,
			language:  this.settings.dictationLanguage,
		});

		try {
			const result = await runner.transcribe(wavBuffer);

			if (!result.text) {
				new Notice("⚠️ SmartWrite: Nenhum texto detectado. Fale mais alto ou tente novamente.");
				this.setState("idle");
				return;
			}

			this.insertText(result.text, editor);

			const secs = (result.duration / 1000).toFixed(1);
			new Notice(`✅ SmartWrite: Ditado inserido (${secs}s)`);
		} catch (err) {
			new Notice(`❌ SmartWrite: Falha na transcrição.\n${(err as Error).message}`);
		} finally {
			this.setState("idle");
		}
	}

	/** Insert transcribed text at the cursor, or at end of line if no editor. */
	private insertText(text: string, editor?: Editor): void {
		if (!editor) {
			// Clipboard fallback when called without an active editor
			navigator.clipboard.writeText(text).then(() => {
				new Notice("📋 SmartWrite: Texto copiado para a área de transferência.");
			});
			return;
		}

		const cursor = editor.getCursor();

		if (this.settings.insertMode === "newline") {
			const lineCount = editor.lineCount();
			const lastLine  = editor.getLine(lineCount - 1);
			editor.replaceRange(
				`\n${text}`,
				{ line: lineCount - 1, ch: lastLine.length }
			);
		} else {
			// Insert at cursor, with a leading space if cursor is mid-word
			const lineText   = editor.getLine(cursor.line);
			const charBefore = lineText[cursor.ch - 1];
			const prefix     = charBefore && charBefore !== " " ? " " : "";
			editor.replaceRange(`${prefix}${text}`, cursor);
		}
	}

	/** Cancel an ongoing recording without transcribing. */
	cancel(): void {
		if (this.state === "recording") {
			this.recorder.cleanup();
			this.setState("idle");
		}
	}

	private setState(next: DictationState): void {
		this.state = next;
		this.onStateChange(next);
	}
}
