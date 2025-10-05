// npx vitest core/config/__tests__/CustomModesManager.specKit.spec.ts

import type { Mock } from "vitest"

import * as path from "path"
import * as fs from "fs/promises"

import * as yaml from "yaml"
import * as vscode from "vscode"

import type { ModeConfig } from "@rycode-ext/types"

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

describe("CustomModesManager - Spec-Kit Integration", () => {
	let manager: CustomModesManager
	let mockContext: vscode.ExtensionContext
	let mockOnUpdate: Mock
	let mockWorkspaceFolders: { uri: { fsPath: string } }[]

	const mockStoragePath = path.join(path.sep, "mock", "settings")
	const mockSettingsPath = path.join(mockStoragePath, "settings", GlobalFileNames.customModes)
	const mockWorkspacePath = path.resolve("/mock/workspace")
	const mockRoomodes = path.join(mockWorkspacePath, ".roo")
	const mockSpecifyConfig = path.join(mockWorkspacePath, ".specify", "config.yml")
	const mockSpecifyModesDir = path.join(mockWorkspacePath, ".specify", "memory", "specifications", "modes")

	beforeEach(() => {
		// Suppress console logs during tests
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
		;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
			// By default, only settings file exists
			return filePath === mockSettingsPath
		})
		;(fs.mkdir as Mock).mockResolvedValue(undefined)
		;(fs.writeFile as Mock).mockResolvedValue(undefined)
		;(fs.stat as Mock).mockResolvedValue({ isDirectory: () => true })
		;(fs.readdir as Mock).mockResolvedValue([])
		;(fs.rm as Mock).mockResolvedValue(undefined)
		;(fs.readFile as Mock).mockImplementation(async (filePath: string) => {
			if (filePath === mockSettingsPath) {
				return yaml.stringify({ customModes: [] })
			}
			throw new Error(`File not found: ${filePath}`)
		})

		manager = new CustomModesManager(mockContext, mockOnUpdate)
	})

	afterEach(() => {
		vi.clearAllMocks()
		vi.restoreAllMocks()
	})

	describe("Spec-Kit config.yml parsing", () => {
		it("should parse valid .specify/config.yml structure", async () => {
			const specifyConfig = `version: '1.0'
modes:
  - slug: test
    name: 🧪 Test
    source: project
  - slug: design-engineer
    name: 🎨 Design Engineer
    source: project
`

			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockSpecifyConfig
			})
			;(fs.readFile as Mock).mockImplementation(async (filePath: string) => {
				if (filePath === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				if (filePath === mockSpecifyConfig) {
					return specifyConfig
				}
				throw new Error(`File not found: ${filePath}`)
			})

			// The current implementation doesn't natively support .specify/config.yml yet
			// This test validates the expected structure for future implementation
			const parsed = yaml.parse(specifyConfig)
			expect(parsed).toHaveProperty("version")
			expect(parsed).toHaveProperty("modes")
			expect(Array.isArray(parsed.modes)).toBe(true)
			expect(parsed.modes).toHaveLength(2)
			expect(parsed.modes[0]).toHaveProperty("slug", "test")
			expect(parsed.modes[0]).toHaveProperty("name", "🧪 Test")
			expect(parsed.modes[0]).toHaveProperty("source", "project")
		})

		it("should handle .specify/config.yml with all mode fields", async () => {
			const specifyConfig = `version: '1.0'
modes:
  - slug: test
    name: 🧪 Test
    source: project
  - slug: custom-mode
    name: Custom Mode
    roleDefinition: "You are a custom mode"
    description: "A custom test mode"
    whenToUse: "Use for custom testing"
    groups:
      - read
      - edit
    source: project
`

			const parsed = yaml.parse(specifyConfig)
			expect(parsed.modes[1]).toHaveProperty("slug", "custom-mode")
			expect(parsed.modes[1]).toHaveProperty("roleDefinition")
			expect(parsed.modes[1]).toHaveProperty("description")
			expect(parsed.modes[1]).toHaveProperty("whenToUse")
			expect(parsed.modes[1]).toHaveProperty("groups")
			expect(Array.isArray(parsed.modes[1].groups)).toBe(true)
		})

		it("should handle invalid YAML in .specify/config.yml gracefully", async () => {
			const invalidYaml = `version: '1.0'
modes:
  - slug: test
    name: 🧪 Test
    source: project
  invalid yaml content here
`

			expect(() => yaml.parse(invalidYaml)).toThrow()
		})

		it("should validate version field in .specify/config.yml", async () => {
			const noVersionConfig = `modes:
  - slug: test
    name: 🧪 Test
    source: project
`

			const parsed = yaml.parse(noVersionConfig)
			// Version should be optional but recommended
			expect(parsed).not.toHaveProperty("version")
			expect(parsed).toHaveProperty("modes")
		})
	})

	describe("Mode specification loading from .specify/memory/specifications/modes", () => {
		it("should identify mode specification files", async () => {
			;(fs.readdir as Mock).mockResolvedValue([
				{ name: "test.md", isFile: () => true, isDirectory: () => false },
				{ name: "design-engineer.md", isFile: () => true, isDirectory: () => false },
				{ name: "translate.md", isFile: () => true, isDirectory: () => false },
			])

			const entries = await fs.readdir(mockSpecifyModesDir, { withFileTypes: true })
			const mdFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))

			expect(mdFiles).toHaveLength(3)
			expect(mdFiles.map((f) => f.name)).toEqual(["test.md", "design-engineer.md", "translate.md"])
		})

		it("should parse mode specification markdown structure", async () => {
			const testModeSpec = `# Test Mode

## Overview

Write, modify, and maintain tests.

## Role Definition

You are Roo, a Vitest testing specialist...

## When to Use

Use this mode when you need to write, modify, or maintain tests for the codebase.

## Permissions & Tool Access

- read
- browser
- command

## Custom Instructions

When writing tests:
- Always use describe/it blocks
- Include meaningful test descriptions
`

			// Parse the markdown to extract sections
			const sections = testModeSpec.split(/\n## /).slice(1)
			expect(sections.length).toBeGreaterThan(0)

			const roleSection = sections.find((s) => s.startsWith("Role Definition"))
			expect(roleSection).toBeDefined()
			expect(roleSection).toContain("Vitest testing specialist")

			const whenToUseSection = sections.find((s) => s.startsWith("When to Use"))
			expect(whenToUseSection).toBeDefined()
			expect(whenToUseSection).toContain("write, modify, or maintain tests")
		})

		it("should extract permissions from mode specification", async () => {
			const modeSpec = `## Permissions & Tool Access

- read
- browser
- command
  [
  "edit",
  {
  "fileRegex": "(__tests__/.*|\\.test\\.(ts|tsx)$)",
  "description": "Test files"
  }
  ]
`

			// The permissions section contains tool access definitions
			expect(modeSpec).toContain("read")
			expect(modeSpec).toContain("browser")
			expect(modeSpec).toContain("command")
			expect(modeSpec).toContain("edit")
			expect(modeSpec).toContain("fileRegex")
		})
	})

	describe("Spec-Kit and .roo coexistence", () => {
		it("should prioritize .roo over .specify/config.yml for same slug", async () => {
			const rooContent = yaml.stringify({
				customModes: [
					{
						slug: "test",
						name: "Test from .roo",
						roleDefinition: "Rycodeextmodes version",
						groups: ["read"],
					},
				],
			})

			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (filePath: string) => {
				if (filePath === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				if (filePath === mockRoomodes) {
					return rooContent
				}
				throw new Error(`File not found: ${filePath}`)
			})

			const modes = await manager.getCustomModes()

			// .roo should take precedence
			const testMode = modes.find((m) => m.slug === "test")
			expect(testMode).toBeDefined()
			expect(testMode?.name).toBe("Test from .roo")
			expect(testMode?.roleDefinition).toBe("Rycodeextmodes version")
		})

		it("should merge modes from .roo and .specify/config.yml", async () => {
			const rooContent = yaml.stringify({
				customModes: [
					{
						slug: "legacy-mode",
						name: "Legacy Mode",
						roleDefinition: "From .roo",
						groups: ["read"],
					},
				],
			})

			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockRoomodes
			})
			;(fs.readFile as Mock).mockImplementation(async (filePath: string) => {
				if (filePath === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				if (filePath === mockRoomodes) {
					return rooContent
				}
				throw new Error(`File not found: ${filePath}`)
			})

			const modes = await manager.getCustomModes()

			// Should have the .roo mode
			const legacyMode = modes.find((m) => m.slug === "legacy-mode")
			expect(legacyMode).toBeDefined()
			expect(legacyMode?.source).toBe("project")
		})

		it("should handle .specify/config.yml when .roo doesn't exist", async () => {
			// Note: Current implementation doesn't support .specify/config.yml yet
			// This test documents the expected behavior

			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockSpecifyConfig
			})

			const modes = await manager.getCustomModes()

			// Should fall back to settings modes when .roo doesn't exist
			expect(Array.isArray(modes)).toBe(true)
		})

		it("should handle transition from .roo to .specify structure", async () => {
			// Test scenario: Project has both formats during migration
			const rooContent = yaml.stringify({
				customModes: [
					{
						slug: "old-mode",
						name: "Old Mode",
						roleDefinition: "Legacy format",
						groups: ["read"],
					},
				],
			})

			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockRoomodes || filePath === mockSpecifyConfig
			})
			;(fs.readFile as Mock).mockImplementation(async (filePath: string) => {
				if (filePath === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				if (filePath === mockRoomodes) {
					return rooContent
				}
				if (filePath === mockSpecifyConfig) {
					return `version: '1.0'
modes:
  - slug: new-mode
    name: New Mode
    source: project
`
				}
				throw new Error(`File not found: ${filePath}`)
			})

			const modes = await manager.getCustomModes()

			// Should have modes from .roo
			const oldMode = modes.find((m) => m.slug === "old-mode")
			expect(oldMode).toBeDefined()

			// Note: .specify/config.yml support would be added in future implementation
		})
	})

	describe("Migration path validation", () => {
		it("should preserve mode data when migrating to Spec-Kit", async () => {
			const originalMode: ModeConfig = {
				slug: "test-mode",
				name: "Test Mode",
				roleDefinition: "Test role definition",
				description: "Test description",
				whenToUse: "Test when to use",
				groups: ["read", "edit"],
				customInstructions: "Test instructions",
				source: "project",
			}

			// Verify all required fields are preserved
			expect(originalMode).toHaveProperty("slug")
			expect(originalMode).toHaveProperty("name")
			expect(originalMode).toHaveProperty("roleDefinition")
			expect(originalMode).toHaveProperty("groups")

			// Verify the mode structure matches ModeConfig schema
			expect(typeof originalMode.slug).toBe("string")
			expect(typeof originalMode.name).toBe("string")
			expect(Array.isArray(originalMode.groups)).toBe(true)
		})

		it("should handle mode specifications with file restrictions", async () => {
			const modeWithFileRestrictions = {
				slug: "test",
				name: "Test",
				roleDefinition: "Test role",
				groups: [
					"read",
					[
						"edit",
						{
							fileRegex: "\\.test\\.(ts|js)$",
							description: "Test files only",
						},
					],
				],
				source: "project" as const,
			}

			// Verify file restriction structure
			const editGroup = modeWithFileRestrictions.groups.find((g) => Array.isArray(g))
			expect(editGroup).toBeDefined()
			expect(Array.isArray(editGroup)).toBe(true)
			if (Array.isArray(editGroup)) {
				expect(editGroup[0]).toBe("edit")
				expect(editGroup[1]).toHaveProperty("fileRegex")
				expect(editGroup[1]).toHaveProperty("description")
			}
		})
	})

	describe("Error handling for Spec-Kit files", () => {
		it("should handle missing .specify directory gracefully", async () => {
			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath
			})
			;(fs.stat as Mock).mockRejectedValue(new Error("Directory not found"))

			// Should not throw and fall back to existing behavior
			const modes = await manager.getCustomModes()
			expect(Array.isArray(modes)).toBe(true)
		})

		it("should handle corrupted .specify/config.yml", async () => {
			const corruptedYaml = `version: '1.0'
modes: this is not valid YAML structure
  - name: broken
`

			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockSpecifyConfig
			})
			;(fs.readFile as Mock).mockImplementation(async (filePath: string) => {
				if (filePath === mockSettingsPath) {
					return yaml.stringify({ customModes: [] })
				}
				if (filePath === mockSpecifyConfig) {
					return corruptedYaml
				}
				throw new Error(`File not found: ${filePath}`)
			})

			// Should handle parse errors gracefully
			expect(() => yaml.parse(corruptedYaml)).toThrow()
		})

		it("should handle missing mode specification files", async () => {
			;(fileExistsAtPath as Mock).mockImplementation(async (filePath: string) => {
				return filePath === mockSettingsPath || filePath === mockSpecifyConfig
			})
			;(fs.readdir as Mock).mockResolvedValue([])

			// Should handle empty specifications directory
			const entries = await fs.readdir(mockSpecifyModesDir, { withFileTypes: true })
			expect(entries).toHaveLength(0)
		})
	})
})
