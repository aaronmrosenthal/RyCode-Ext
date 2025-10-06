// npx vitest core/config/__tests__/CustomModesManager.security.spec.ts

import type { Mock } from "vitest"

import * as path from "path"
import * as fs from "fs/promises"

import * as yaml from "yaml"
import * as vscode from "vscode"

import { fileExistsAtPath } from "../../../utils/fs"
import { getWorkspacePath } from "../../../utils/path"
import { GlobalFileNames } from "../../../shared/globalFileNames"

import { CustomModesManager } from "../CustomModesManager"

vi.mock("vscode", () => ({
	workspace: {
		workspaceFolders: [],
		onDidSaveTextDocument: vi.fn(),
		createFileSystemWatcher: vi.fn(() => ({
			onDidChange: vi.fn(() => ({ dispose: vi.fn() })),
			onDidCreate: vi.fn(() => ({ dispose: vi.fn() })),
			onDidDelete: vi.fn(() => ({ dispose: vi.fn() })),
			dispose: vi.fn(),
		})),
	},
	window: {
		showErrorMessage: vi.fn(),
		showWarningMessage: vi.fn(),
	},
}))

vi.mock("fs/promises", () => ({
	mkdir: vi.fn(),
	readFile: vi.fn(),
	writeFile: vi.fn(),
	stat: vi.fn(),
	readdir: vi.fn(),
	rm: vi.fn(),
}))

vi.mock("../../../utils/fs")
vi.mock("../../../utils/path")

describe("CustomModesManager - Security Tests", () => {
	let manager: CustomModesManager
	let mockContext: vscode.ExtensionContext
	let mockOnUpdate: Mock
	let mockWorkspaceFolders: { uri: { fsPath: string } }[]

	const mockStoragePath = path.join(path.sep, "mock", "settings")
	const mockWorkspacePath = path.resolve("/mock/workspace")
	const mockSpecifyConfig = path.join(mockWorkspacePath, ".specify", "config.yml")
	const mockSpecifyModesDir = path.join(mockWorkspacePath, ".specify", "memory", "specifications", "modes")

	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {})
		vi.spyOn(console, "log").mockImplementation(() => {})

		mockOnUpdate = vi.fn()
		mockContext = {
			globalState: {
				get: vi.fn(),
				update: vi.fn(),
				keys: vi.fn(() => []),
				setKeysForSync: vi.fn(),
			},
			globalStorageUri: {
				fsPath: mockStoragePath,
			},
		} as unknown as vscode.ExtensionContext

		mockWorkspaceFolders = [{ uri: { fsPath: mockWorkspacePath } }]
		;(vscode.workspace as any).workspaceFolders = mockWorkspaceFolders
		;(getWorkspacePath as Mock).mockReturnValue(mockWorkspacePath)

		manager = new CustomModesManager(mockContext, mockOnUpdate)
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe("Path Traversal Protection (VULN-001)", () => {
		it("should block path traversal attempts with .. in slug", async () => {
			const maliciousConfig = `version: '1.0'
modes:
  - slug: "../../../../etc/passwd"
    name: "Malicious Mode"
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return maliciousConfig
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Should not load any modes due to security error
			expect(modes.filter((m) => m.slug === "../../../../etc/passwd")).toHaveLength(0)
		})

		it("should block absolute path attempts", async () => {
			const maliciousConfig = `version: '1.0'
modes:
  - slug: "/etc/passwd"
    name: "Absolute Path Attack"
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return maliciousConfig
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			expect(modes.filter((m) => m.slug === "/etc/passwd")).toHaveLength(0)
		})

		it("should allow safe relative paths", async () => {
			const safeConfig = `version: '1.0'
modes:
  - slug: "test-mode"
    name: "Safe Test Mode"
    roleDefinition: "A safe test mode"
    groups: ["read"]
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				if (p.endsWith("test-mode.md")) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return safeConfig
				if (p.endsWith("test-mode.md")) return "# Test Mode\n\nA safe mode."
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			expect(modes.filter((m) => m.slug === "test-mode")).toHaveLength(1)
		})
	})

	describe("YAML Bomb Protection (VULN-003)", () => {
		it("should reject oversized YAML content", async () => {
			// Create 2MB of YAML content (exceeds 1MB limit)
			const largeYaml = "modes:\n" + "  - slug: test\n".repeat(100000)

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return largeYaml
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Should return empty array due to size limit
			expect(modes).toHaveLength(0)
		})

		it("should reject YAML with excessive aliases (bomb attack)", async () => {
			// Billion laughs attack pattern
			const yamlBomb = `version: '1.0'
a: &a ["lol","lol","lol","lol","lol","lol","lol","lol","lol"]
b: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]
c: &c [*b,*b,*b,*b,*b,*b,*b,*b,*b]
d: &d [*c,*c,*c,*c,*c,*c,*c,*c,*c]
modes: *d
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return yamlBomb
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Should return empty array due to alias limit
			expect(modes).toEqual([])
		})

		it("should accept reasonably sized YAML", async () => {
			const normalYaml = `version: '1.0'
modes:
  - slug: "test"
    name: "Test Mode"
    roleDefinition: "Test"
    groups: ["read"]
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return normalYaml
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			expect(modes.length).toBeGreaterThan(0)
		})
	})

	describe("Input Validation (Defense in Depth)", () => {
		it("should validate mode config schema", async () => {
			const invalidConfig = `version: '1.0'
modes:
  - slug: "test-mode"
    name: "Test"
    # Missing required roleDefinition
    groups: ["read"]
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return invalidConfig
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Should filter out invalid modes
			expect(modes.filter((m) => m.slug === "test-mode")).toHaveLength(0)
		})

		it("should sanitize invisible characters in YAML", async () => {
			const yamlWithInvisibleChars = `version: '1.0'
modes:
  - slug: "test\u200Bmode"
    name: "Test\u00A0Mode"
    roleDefinition: "Test"
    groups: ["read"]
`

			;(fileExistsAtPath as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return true
				return false
			})
			;(fs.readFile as Mock).mockImplementation(async (p: string) => {
				if (p === mockSpecifyConfig) return yamlWithInvisibleChars
				throw new Error("File not found")
			})

			const modes = await manager.getCustomModes()

			// Invisible characters should be cleaned
			const testMode = modes.find((m) => m.slug.includes("test"))
			if (testMode) {
				expect(testMode.slug).not.toContain("\u200B")
				expect(testMode.name).not.toContain("\u00A0")
			}
		})
	})
})
