/**
 * Configurable keybindings for pi-subagents TUI components.
 * 
 * Users can override defaults by creating:
 *   ~/.pi/agent/extensions/pi-subagents-keybindings.json
 * 
 * Example:
 * {
 *   "listNew": "ctrl+n",
 *   "listDelete": ["ctrl+d", "delete"],
 *   "wordLeft": ["ctrl+left", "ctrl+b"]
 * }
 */

import { matchesKey } from "@mariozechner/pi-tui";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// =============================================================================
// Default Keybindings
// =============================================================================

export const DEFAULT_KEYBINDINGS = {
	// Agent list view
	listNew: "alt+n",
	listClone: "ctrl+k",
	listDelete: ["ctrl+d", "delete"],
	listRun: "ctrl+r",
	listParallel: "ctrl+p",
	listSelect: "tab",
	listDeselect: "shift+tab",
	
	// Agent/chain detail view
	detailBack: ["escape", "ctrl+c"],
	detailScrollUp: "up",
	detailScrollDown: "down",
	detailPageUp: ["pageup", "shift+up"],
	detailPageDown: ["pagedown", "shift+down"],
	
	// Edit screens
	editSave: "ctrl+s",
	editDiscard: ["escape", "ctrl+c"],
	editNavUp: "up",
	editNavDown: "down",
	editFieldSelect: "return",
	
	// Parallel builder
	parallelBack: ["escape", "ctrl+c"],
	parallelAdd: "ctrl+a",
	parallelRemove: ["delete", "ctrl+d"],
	parallelRun: "ctrl+r",
	
	// Chain clarification TUI
	chainNavUp: "up",
	chainNavDown: "down",
	chainNavPageUp: ["pageup", "shift+up"],
	chainNavPageDown: ["pagedown", "shift+down"],
	chainEdit: "e",
	chainOutput: "o",
	chainReads: "r",
	chainProgress: "p",
	chainConfirm: "return",
	chainCancel: ["escape", "ctrl+c"],
	chainBackspace: "backspace",
	
	// Task input
	taskToggleSkipClarify: "tab",
	taskSubmit: "return",
	taskCancel: ["escape", "ctrl+c"],
	
	// Template selector
	templateNavUp: "up",
	templateNavDown: "down",
	templateSelect: "return",
	templateCancel: ["escape", "ctrl+c"],
	templateToggleScope: "tab",
	
	// Text editor (used in chain clarify)
	editorWordLeft: ["alt+left", "ctrl+left"],
	editorWordRight: ["alt+right", "ctrl+right"],
	editorDeleteWord: "alt+backspace",
	editorNavUp: "up",
	editorNavDown: "down",
	editorNavLeft: "left",
	editorNavRight: "right",
	editorHome: "home",
	editorEnd: "end",
	editorDocStart: "ctrl+home",
	editorDocEnd: "ctrl+end",
	editorBackspace: "backspace",
	editorDelete: "delete",
	editorNewLine: "return",
	editorCancel: ["escape", "ctrl+c"],
	
	// General
	generalConfirm: "return",
	generalCancel: ["escape", "ctrl+c"],
	generalSearchBackspace: "backspace",
};

export type KeybindAction = keyof typeof DEFAULT_KEYBINDINGS;

// =============================================================================
// User Keybindings Loading
// =============================================================================

let userKeybindings: Partial<Record<KeybindAction, string | string[]>> = {};
let loaded = false;

function getConfigPath(): string {
	return path.join(os.homedir(), ".pi", "agent", "extensions", "pi-subagents-keybindings.json");
}

export function loadUserKeybindings(): void {
	if (loaded) return;
	loaded = true;
	
	const configPath = getConfigPath();
	try {
		if (fs.existsSync(configPath)) {
			const content = fs.readFileSync(configPath, "utf-8");
			const parsed = JSON.parse(content);
			if (typeof parsed === "object" && parsed !== null) {
				userKeybindings = {};
				for (const [key, value] of Object.entries(parsed)) {
					if (key in DEFAULT_KEYBINDINGS) {
						userKeybindings[key as KeybindAction] = value as string | string[];
					}
				}
			}
		}
	} catch (err) {
		// Silently ignore config errors - fall back to defaults
		console.error(`[pi-subagents] Warning: Failed to load keybindings config: ${err}`);
	}
}

export function reloadUserKeybindings(): void {
	loaded = false;
	userKeybindings = {};
	loadUserKeybindings();
}

// =============================================================================
// Key Matching Helper
// =============================================================================

/**
 * Get the configured key(s) for an action.
 * Returns user override if set, otherwise default.
 */
export function getKey(action: KeybindAction): string | string[] {
	return userKeybindings[action] ?? DEFAULT_KEYBINDINGS[action];
}

/**
 * Check if input data matches the keybinding for an action.
 * Handles both single keys and arrays of alternatives.
 */
export function matchesKeyAction(data: string, action: KeybindAction): boolean {
	const keys = getKey(action);
	if (Array.isArray(keys)) {
		return keys.some(k => matchesKey(data, k));
	}
	return matchesKey(data, keys);
}

/**
 * Get display text for a keybinding (for footer hints).
 * Returns first key if array, otherwise the single key.
 */
export function getKeyDisplay(action: KeybindAction): string {
	const keys = getKey(action);
	if (Array.isArray(keys)) {
		return keys[0] ?? "";
	}
	return keys;
}
