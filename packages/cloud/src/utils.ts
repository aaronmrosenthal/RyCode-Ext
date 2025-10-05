import type { ExtensionContext } from "vscode"

export function getUserAgent(context?: ExtensionContext): string {
	return `RyCode-Ext ${context?.extension?.packageJSON?.version || "unknown"}`
}
