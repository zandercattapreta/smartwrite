/**
 * AudioRecorder
 * Captures microphone audio via the Web Audio API and exports it as a
 * 16-bit PCM WAV file at 16 kHz mono — the exact format whisper-cli expects.
 */

const TARGET_SAMPLE_RATE = 16000;
const TARGET_CHANNELS    = 1;

export class AudioRecorder {
	private mediaRecorder: MediaRecorder | null = null;
	private audioContext:  AudioContext  | null = null;
	private stream:        MediaStream   | null = null;
	private chunks: Blob[] = [];

	/** Returns true if currently recording. */
	get isRecording(): boolean {
		return this.mediaRecorder?.state === "recording";
	}

	/** Start microphone capture. Throws if permission is denied. */
	async start(): Promise<void> {
		this.chunks = [];

		this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		this.audioContext = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });

		// Use opus inside webm as the recording format (widely supported in Electron)
		const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
			? "audio/webm;codecs=opus"
			: "audio/webm";

		this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
		this.mediaRecorder.ondataavailable = (e: BlobEvent) => {
			if (e.data.size > 0) this.chunks.push(e.data);
		};

		this.mediaRecorder.start(100); // collect chunks every 100 ms
	}

	/**
	 * Stop recording and return a 16-bit 16kHz mono WAV as a Buffer.
	 * The caller is responsible for writing it to disk and cleaning up.
	 */
	async stop(): Promise<Buffer> {
		return new Promise((resolve, reject) => {
			if (!this.mediaRecorder) {
				reject(new Error("No active recording."));
				return;
			}

			this.mediaRecorder.onstop = async () => {
				try {
					const blob        = new Blob(this.chunks, { type: "audio/webm" });
					const arrayBuffer = await blob.arrayBuffer();
					const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
					const wav         = this.encodeWav(audioBuffer);
					resolve(wav);
				} catch (err) {
					reject(err);
				} finally {
					this.cleanup();
				}
			};

			this.mediaRecorder.stop();
		});
	}

	/** Release all media resources. */
	cleanup(): void {
		this.stream?.getTracks().forEach(t => t.stop());
		this.audioContext?.close();
		this.stream        = null;
		this.audioContext  = null;
		this.mediaRecorder = null;
		this.chunks        = [];
	}

	// ---------------------------------------------------------------------------
	// WAV encoding — 16-bit PCM, mono, 16 kHz
	// ---------------------------------------------------------------------------

	private encodeWav(audioBuffer: AudioBuffer): Buffer {
		// Mix down to mono by averaging all channels
		const numSamples = audioBuffer.length;
		const pcm        = new Float32Array(numSamples);

		for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
			const channel   = audioBuffer.getChannelData(c);
			const nChannels = audioBuffer.numberOfChannels as number;
			for (let i = 0; i < numSamples; i++) {
				(pcm as unknown as number[])[i] =
					((pcm as unknown as number[])[i] ?? 0) +
					(channel[i] ?? 0) / nChannels;
			}
		}

		// Convert Float32 → Int16
		const int16 = new Int16Array(numSamples);
		for (let i = 0; i < numSamples; i++) {
			const s  = Math.max(-1, Math.min(1, (pcm as unknown as number[])[i] ?? 0));
			(int16 as unknown as number[])[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
		}

		// Build WAV header
		const dataLength  = int16.byteLength;
		const buffer      = Buffer.alloc(44 + dataLength);
		const sampleRate  = TARGET_SAMPLE_RATE;
		const numChannels = TARGET_CHANNELS;
		const bitsPerSample = 16;
		const byteRate    = (sampleRate * numChannels * bitsPerSample) / 8;
		const blockAlign  = (numChannels * bitsPerSample) / 8;

		buffer.write("RIFF",                   0, "ascii");
		buffer.writeUInt32LE(36 + dataLength,   4);
		buffer.write("WAVE",                    8, "ascii");
		buffer.write("fmt ",                   12, "ascii");
		buffer.writeUInt32LE(16,               16); // PCM chunk size
		buffer.writeUInt16LE(1,                20); // PCM format
		buffer.writeUInt16LE(numChannels,      22);
		buffer.writeUInt32LE(sampleRate,       24);
		buffer.writeUInt32LE(byteRate,         28);
		buffer.writeUInt16LE(blockAlign,       32);
		buffer.writeUInt16LE(bitsPerSample,    34);
		buffer.write("data",                   36, "ascii");
		buffer.writeUInt32LE(dataLength,       40);

		Buffer.from(int16.buffer).copy(buffer, 44);

		return buffer;
	}
}
