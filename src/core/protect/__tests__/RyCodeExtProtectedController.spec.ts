import path from "path"
import { RyCodeExtProtectedController } from "../RyCodeExtProtectedController"

describe("RyCodeExtProtectedController", () => {
	const TEST_CWD = "/test/workspace"
	let controller: RyCodeExtProtectedController

	beforeEach(() => {
		controller = new RyCodeExtProtectedController(TEST_CWD)
	})

	describe("isWriteProtected", () => {
		it("should protect .rycodeextignore file", () => {
			expect(controller.isWriteProtected(".rycodeextignore")).toBe(true)
		})

		it("should protect files in .roo directory", () => {
			expect(controller.isWriteProtected(".roo/config.json")).toBe(true)
			expect(controller.isWriteProtected(".roo/settings/user.json")).toBe(true)
			expect(controller.isWriteProtected(".roo/modes/custom.json")).toBe(true)
		})

		it("should protect .rooprotected file", () => {
			expect(controller.isWriteProtected(".rooprotected")).toBe(true)
		})

		it("should protect .rycodeextmodes files", () => {
			expect(controller.isWriteProtected(".rycodeextmodes")).toBe(true)
		})

		it("should protect .roorules* files", () => {
			expect(controller.isWriteProtected(".roorules")).toBe(true)
			expect(controller.isWriteProtected(".roorules.md")).toBe(true)
		})

		it("should protect .clinerules* files", () => {
			expect(controller.isWriteProtected(".clinerules")).toBe(true)
			expect(controller.isWriteProtected(".clinerules.md")).toBe(true)
		})

		it("should protect files in .vscode directory", () => {
			expect(controller.isWriteProtected(".vscode/settings.json")).toBe(true)
			expect(controller.isWriteProtected(".vscode/launch.json")).toBe(true)
			expect(controller.isWriteProtected(".vscode/tasks.json")).toBe(true)
		})

		it("should protect .code-workspace files", () => {
			expect(controller.isWriteProtected("myproject.code-workspace")).toBe(true)
			expect(controller.isWriteProtected("pentest.code-workspace")).toBe(true)
			expect(controller.isWriteProtected(".code-workspace")).toBe(true)
			expect(controller.isWriteProtected("folder/workspace.code-workspace")).toBe(true)
		})

		it("should protect AGENTS.md file", () => {
			expect(controller.isWriteProtected("AGENTS.md")).toBe(true)
		})

		it("should protect AGENT.md file", () => {
			expect(controller.isWriteProtected("AGENT.md")).toBe(true)
		})

		it("should not protect other files starting with .roo", () => {
			expect(controller.isWriteProtected(".roosettings")).toBe(false)
			expect(controller.isWriteProtected(".rooconfig")).toBe(false)
		})

		it("should not protect regular files", () => {
			expect(controller.isWriteProtected("src/index.ts")).toBe(false)
			expect(controller.isWriteProtected("package.json")).toBe(false)
			expect(controller.isWriteProtected("README.md")).toBe(false)
		})

		it("should not protect files that contain 'roo' but don't start with .roo", () => {
			expect(controller.isWriteProtected("src/roo-utils.ts")).toBe(false)
			expect(controller.isWriteProtected("config/roo.config.js")).toBe(false)
		})

		it("should handle nested paths correctly", () => {
			expect(controller.isWriteProtected(".roo/config.json")).toBe(true) // .roo/** matches at root
			expect(controller.isWriteProtected("nested/.rycodeextignore")).toBe(true) // .rycodeextignore matches anywhere by default
			expect(controller.isWriteProtected("nested/.rycodeextmodes")).toBe(true) // .rycodeextmodes matches anywhere by default
			expect(controller.isWriteProtected("nested/.roorules.md")).toBe(true) // .roorules* matches anywhere by default
		})

		it("should handle absolute paths by converting to relative", () => {
			const absolutePath = path.join(TEST_CWD, ".rycodeextignore")
			expect(controller.isWriteProtected(absolutePath)).toBe(true)
		})

		it("should handle paths with different separators", () => {
			expect(controller.isWriteProtected(".roo\\config.json")).toBe(true)
			expect(controller.isWriteProtected(".roo/config.json")).toBe(true)
		})
	})

	describe("getProtectedFiles", () => {
		it("should return set of protected files from a list", () => {
			const files = ["src/index.ts", ".rycodeextignore", "package.json", ".roo/config.json", "README.md"]

			const protectedFiles = controller.getProtectedFiles(files)

			expect(protectedFiles).toEqual(new Set([".rycodeextignore", ".roo/config.json"]))
		})

		it("should return empty set when no files are protected", () => {
			const files = ["src/index.ts", "package.json", "README.md"]

			const protectedFiles = controller.getProtectedFiles(files)

			expect(protectedFiles).toEqual(new Set())
		})
	})

	describe("annotatePathsWithProtection", () => {
		it("should annotate paths with protection status", () => {
			const files = ["src/index.ts", ".rycodeextignore", ".roo/config.json", "package.json"]

			const annotated = controller.annotatePathsWithProtection(files)

			expect(annotated).toEqual([
				{ path: "src/index.ts", isProtected: false },
				{ path: ".rycodeextignore", isProtected: true },
				{ path: ".roo/config.json", isProtected: true },
				{ path: "package.json", isProtected: false },
			])
		})
	})

	describe("getProtectionMessage", () => {
		it("should return appropriate protection message", () => {
			const message = controller.getProtectionMessage()
			expect(message).toBe("This is a Roo configuration file and requires approval for modifications")
		})
	})

	describe("getInstructions", () => {
		it("should return formatted instructions about protected files", () => {
			const instructions = controller.getInstructions()

			expect(instructions).toContain("# Protected Files")
			expect(instructions).toContain("write-protected")
			expect(instructions).toContain(".rycodeextignore")
			expect(instructions).toContain(".roo/**")
			expect(instructions).toContain("\u{1F6E1}") // Shield symbol
		})
	})

	describe("getProtectedPatterns", () => {
		it("should return the list of protected patterns", () => {
			const patterns = RyCodeExtProtectedController.getProtectedPatterns()

			expect(patterns).toEqual([
				".rycodeextignore",
				".rycodeextmodes",
				".roorules*",
				".clinerules*",
				".roo/**",
				".vscode/**",
				"*.code-workspace",
				".rooprotected",
				"AGENTS.md",
				"AGENT.md",
			])
		})
	})
})
