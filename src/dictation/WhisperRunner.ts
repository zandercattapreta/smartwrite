import { spawn } from "child_process";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";

export interface WhisperRunnerOptions {
	cliPath:    string; // caminho do executável whisper-cli (ex: "whisper-cli")
	model:      string; // ex: "small"
	modelsDir?: string; // pasta com os .bin — se vazio, usa o padrão do whisper-cli
	language:   string; // "auto" | "pt" | "en" | ...
}

export interface WhisperResult {
	text:     string;
	duration: number; // ms
}

export class WhisperRunner {
	constructor(private opts: WhisperRunnerOptions) {}

	/**
	 * Run whisper-cli on a WAV buffer.
	 * Writes to a temp file, runs the process, then removes the temp file.
	 */
	async transcribe(wavBuffer: Buffer): Promise<WhisperResult> {
		const tmpFile = path.join(os.tmpdir(), `smartwrite_${Date.now()}.wav`);
		fs.writeFileSync(tmpFile, wavBuffer);

		try {
			const start  = Date.now();
			const text   = await this.runWhisper(tmpFile);
			const duration = Date.now() - start;
			return { text: text.trim(), duration };
		} finally {
			// Always clean up the temp WAV file
			try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
		}
	}

	private runWhisper(wavPath: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const args = this.buildArgs(wavPath);
			const proc = spawn(this.opts.cliPath, args, { shell: false });

			let stdout = "";
			let stderr = "";

			proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
			proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

			proc.on("close", (code) => {
				if (code !== 0) {
					reject(new Error(
						`whisper-cli exited with code ${code}.\n` +
						`stderr: ${stderr.slice(0, 500)}`
					));
					return;
				}

				// whisper-cli outputs lines in the format: [HH:MM:SS.mmm --> HH:MM:SS.mmm]  text
				// We strip the timestamps and join the text segments.
				const text = stdout
					.split("\n")
					.map(line => line.replace(/^\[[\d:.,\s>-]+\]\s*/, "").trim())
					.filter(Boolean)
					.join(" ");

				resolve(text);
			});

			proc.on("error", (err) => {
				if ((err as NodeJS.ErrnoException).code === "ENOENT") {
					reject(new Error(
						`whisper-cli não encontrado em "${this.opts.cliPath}".\n` +
						`Execute o SmartWrite Installer para instalar automaticamente.`
					));
				} else {
					reject(err);
				}
			});
		});
	}

	private buildArgs(wavPath: string): string[] {
		const args = [
			"-f", wavPath,
			"-m", this.resolveModelPath(),
			"-l", this.opts.language,
			"--output-txt", "false",  // saída apenas no stdout
			"--no-prints",            // sem progress bars
		];

		return args;
	}

	private resolveModelPath(): string {
		const modelName = `ggml-${this.opts.model}.bin`;

		// 1. Pasta explícita nas settings
		if (this.opts.modelsDir) {
			return path.join(this.opts.modelsDir, modelName);
		}

		// 2. Homebrew padrão no macOS (brew install whisper-cpp)
		const brewPath = `/opt/homebrew/share/whisper.cpp/models/${modelName}`;
		if (fs.existsSync(brewPath)) return brewPath;

		const brewIntelPath = `/usr/local/share/whisper.cpp/models/${modelName}`;
		if (fs.existsSync(brewIntelPath)) return brewIntelPath;

		// 3. Deixa o whisper-cli tentar encontrar pelo nome curto
		return modelName;
	}
}
