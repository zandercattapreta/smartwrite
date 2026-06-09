export interface SmartWriteSettings {
	// Dictation
	whisperCliPath: string;       // path do binário whisper-cli (auto-detectado ou manual)
	whisperModel: string;         // ex: "small", "base", "medium"
	whisperModelsDir: string;     // pasta onde os modelos .bin ficam
	dictationLanguage: string;    // "auto" | "pt" | "en" | "es" | ...
	insertMode: "cursor" | "newline"; // inserir no cursor ou em nova linha
}

export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
	{ value: "auto", label: "Detectar automaticamente" },
	{ value: "pt",   label: "Português" },
	{ value: "en",   label: "English" },
	{ value: "es",   label: "Español" },
	{ value: "fr",   label: "Français" },
	{ value: "de",   label: "Deutsch" },
	{ value: "it",   label: "Italiano" },
	{ value: "ja",   label: "日本語" },
	{ value: "zh",   label: "中文" },
];

export const MODEL_OPTIONS: { value: string; label: string; size: string }[] = [
	{ value: "tiny",            label: "Tiny",           size: "~75 MB"  },
	{ value: "base",            label: "Base",           size: "~142 MB" },
	{ value: "small",           label: "Small",          size: "~466 MB" },
	{ value: "medium",          label: "Medium",         size: "~1.5 GB" },
	{ value: "large-v3-turbo",  label: "Large v3 Turbo", size: "~1.6 GB" },
];

export const DEFAULT_SETTINGS: SmartWriteSettings = {
	whisperCliPath:  "whisper-cli",  // assume está no PATH após brew install
	whisperModel:    "small",
	whisperModelsDir: "",            // deixado vazio — whisper-cli encontra via XDG
	dictationLanguage: "auto",
	insertMode:      "cursor",
};
