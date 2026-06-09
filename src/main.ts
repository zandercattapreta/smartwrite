import { Plugin } from "obsidian";

export default class SmartWrite extends Plugin {
	async onload() {
		console.log("SmartWrite loaded");
	}

	async onunload() {
		console.log("SmartWrite unloaded");
	}
}
