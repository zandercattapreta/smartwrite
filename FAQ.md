# SmartWrite — FAQ

Frequently asked questions.

---

## General

**What is SmartWrite?**  
SmartWrite is an open source Obsidian plugin that gives writers clarity feedback on their text and publishes directly to Substack — without leaving Obsidian.

**Is it free?**  
The core plugin is free and open source under the MIT license. A Pro tier with additional features (more personas, voice capture, historical reports) is planned for a future release.

**What platforms does it support?**  
macOS is the primary supported platform for v0.1. Windows and Linux support is planned for v1.0.

**Does it require an internet connection?**  
No. All AI features run locally via [Ollama](https://ollama.ai). No text is ever sent to external servers. Voice transcription uses [whisper.cpp](https://github.com/ggml-org/whisper.cpp), also fully offline.

---

## AI & Privacy

**How does the AI feedback work?**  
SmartWrite uses Ollama — a local AI runtime — to run language models entirely on your machine. When you request feedback, your text is sent to Ollama running locally, analyzed, and the results are displayed in the sidebar. Nothing leaves your computer.

**Which AI models does it use?**  
Any model supported by Ollama. SmartWrite works best with models that handle Portuguese well, such as `qwen2.5` or `llama3.2`.

**What are personas?**  
Personas are editorial perspectives that evaluate your text from different angles. For example, the `common-reader` persona identifies passages where an average reader will get confused or bored. The `critical-editor` evaluates structure, logic, and pacing. SmartWrite ships with a curated set of personas and allows you to add custom ones.

**Does SmartWrite use my Substack credentials?**  
Your Substack session cookie is stored locally in your Obsidian vault settings. It never leaves your machine.

---

## Publishing

**How does Substack publishing work?**  
SmartWrite converts your Markdown note to Substack's format, uploads any local images to the Substack CDN, and creates the post via Substack's API. After publishing, the post URL and date are written to your note's frontmatter.

**Can I publish as a draft first?**  
Yes. SmartWrite supports three modes: draft, scheduled (with a date), and publish immediately.

**Will my formatting be preserved?**  
Standard Markdown formatting (headings, bold, italic, lists, links, images, code blocks) is preserved. Obsidian-specific syntax (wikilinks, callouts) is converted to the closest Substack equivalent.

---

## Voice Capture *(Post-MVP)*

**What is voice capture?**  
Voice capture lets you record an idea by voice. SmartWrite transcribes it using whisper.cpp (offline) and creates a new note in your vault with the transcript for later refinement.

**Does it transcribe in real time?**  
No — voice capture is for recording quick ideas, not for dictating text inline. You record, stop, and the transcript appears as a separate note.

**Which languages does it support?**  
Automatic language detection. Portuguese is the primary language, with English as secondary.

---

## Contributing

**How can I contribute?**  
See [CONTRIBUTING.md](CONTRIBUTING.md). All contributions are welcome — bug reports, feature requests, code, documentation, and persona definitions.

**Can I create custom personas?**  
Yes. Persona files follow a standard format documented in the wiki. You can create personas calibrated to your own editorial voice.

---

> Don't see your question here? [Open an issue](https://github.com/zandercattapreta/smartwrite/issues).
