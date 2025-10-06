import * as vscode from "vscode"
import * as path from "path"
import * as fs from "fs/promises"
import * as os from "os"

import * as yaml from "yaml"
import stripBom from "strip-bom"

import { type ModeConfig, type PromptComponent, customModesSettingsSchema, modeConfigSchema } from "@rycode-ext/types"

import { fileExistsAtPath } from "../../utils/fs"
import { getWorkspacePath } from "../../utils/path"
import { getGlobalRooDirectory } from "../../services/rycode-ext-config"
import { logger } from "../../utils/logging"
import { GlobalFileNames } from "../../shared/globalFileNames"
import { ensureSettingsDirectoryExists } from "../../utils/globalContext"
import { t } from "../../i18n"

const MODES_FILENAME = ".modes"
const SPECIFY_CONFIG_PATH = ".specify/config.yml"
const SPECIFY_MODES_DIR = ".specify/memory/specifications/modes"

// Security configuration
const MAX_YAML_SIZE = 1_000_000 // 1MB raw content
const MAX_EXPANDED_SIZE = 10_000_000 // 10MB after parsing
const MAX_YAML_ALIAS_COUNT = 100 // Prevent YAML bombs
const REGEX_TIMEOUT_MS = 100 // Regex execution timeout

/**
 * Security error for path traversal and other security violations
 */
class SecurityError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "SecurityError"
	}
}

// Type definitions for import/export functionality
interface RuleFile {
	relativePath: string
	content: string
}

interface ExportedModeConfig extends ModeConfig {
	rulesFiles?: RuleFile[]
}

interface ImportData {
	customModes: ExportedModeConfig[]
}

interface ExportResult {
	success: boolean
	yaml?: string
	error?: string
}

interface ImportResult {
	success: boolean
	error?: string
}

export class CustomModesManager {
	private static readonly cacheTTL = 10_000

	private disposables: vscode.Disposable[] = []
	private isWriting = false
	private writeQueue: Array<() => Promise<void>> = []
	private cachedModes: ModeConfig[] | null = null
	private cachedAt: number = 0

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly onUpdate: () => Promise<void>,
	) {
		this.watchCustomModesFiles().catch((error) => {
			console.error("[CustomModesManager] Failed to setup file watchers:", error)
		})
	}

	private async queueWrite(operation: () => Promise<void>): Promise<void> {
		this.writeQueue.push(operation)

		if (!this.isWriting) {
			await this.processWriteQueue()
		}
	}

	private async processWriteQueue(): Promise<void> {
		if (this.isWriting || this.writeQueue.length === 0) {
			return
		}

		this.isWriting = true

		try {
			while (this.writeQueue.length > 0) {
				const operation = this.writeQueue.shift()

				if (operation) {
					await operation()
				}
			}
		} finally {
			this.isWriting = false
		}
	}

	/**
	 * Validates that a path stays within the allowed base directory
	 * Prevents path traversal attacks (CWE-22)
	 *
	 * @param basePath - The base directory that paths must stay within
	 * @param userInput - The user-provided path component
	 * @returns The validated absolute path
	 * @throws SecurityError if path traversal is detected
	 */
	private validateSafePath(basePath: string, userInput: string): string {
		// Reject absolute paths
		if (path.isAbsolute(userInput)) {
			logger.warn("[Security] Absolute path blocked:", { userInput })
			throw new SecurityError(`Absolute paths not allowed: ${userInput}`)
		}

		// Resolve both paths to absolute form
		const resolvedBase = path.resolve(basePath)
		const resolvedPath = path.resolve(basePath, userInput)

		// Calculate relative path from base to target
		const relativePath = path.relative(resolvedBase, resolvedPath)

		// Reject if path escapes the base directory
		if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
			logger.warn("[Security] Path traversal blocked:", { basePath, userInput, resolvedPath })
			throw new SecurityError(`Path traversal detected: ${userInput}`)
		}

		return resolvedPath
	}

	/**
	 * Sanitize parsed object to prevent prototype pollution (CWE-1321)
	 * Removes dangerous keys that could affect Object.prototype
	 *
	 * Security: Prevents attacks like:
	 * { "__proto__": { "isAdmin": true } }
	 * { "constructor": { "prototype": { "isAdmin": true } } }
	 */
	private sanitizeObject(obj: any): any {
		if (obj === null || typeof obj !== "object") {
			return obj
		}

		// Block dangerous keys that could pollute prototypes
		const dangerousKeys = ["__proto__", "constructor", "prototype"]

		if (Array.isArray(obj)) {
			return obj.map((item) => this.sanitizeObject(item))
		}

		// Create object with null prototype (no inherited properties)
		const sanitized: Record<string, any> = Object.create(null)

		for (const [key, value] of Object.entries(obj)) {
			if (!dangerousKeys.includes(key)) {
				sanitized[key] = this.sanitizeObject(value)
			} else {
				logger.warn("[Security] Blocked prototype pollution attempt", {
					key,
					type: "prototype_pollution",
				})
			}
		}

		return sanitized
	}

	private async getWorkspaceModes(): Promise<string | undefined> {
		const workspaceFolders = vscode.workspace.workspaceFolders

		if (!workspaceFolders || workspaceFolders.length === 0) {
			return undefined
		}

		const workspaceRoot = getWorkspacePath()
		const modesPath = path.join(workspaceRoot, MODES_FILENAME)
		const exists = await fileExistsAtPath(modesPath)
		return exists ? modesPath : undefined
	}

	private async getSpecifyConfigPath(): Promise<string | undefined> {
		const workspaceFolders = vscode.workspace.workspaceFolders

		if (!workspaceFolders || workspaceFolders.length === 0) {
			return undefined
		}

		const workspaceRoot = getWorkspacePath()
		const specifyConfigPath = path.join(workspaceRoot, SPECIFY_CONFIG_PATH)
		const exists = await fileExistsAtPath(specifyConfigPath)
		return exists ? specifyConfigPath : undefined
	}

	private async getSpecifyModesDir(): Promise<string | undefined> {
		const workspaceFolders = vscode.workspace.workspaceFolders

		if (!workspaceFolders || workspaceFolders.length === 0) {
			return undefined
		}

		const workspaceRoot = getWorkspacePath()
		const modesDir = path.join(workspaceRoot, SPECIFY_MODES_DIR)

		try {
			const stat = await fs.stat(modesDir)
			return stat.isDirectory() ? modesDir : undefined
		} catch {
			return undefined
		}
	}

	/**
	 * Parse mode specification from markdown file
	 * Extracts configuration from markdown sections
	 */
	private parseModeSpecification(content: string, slug: string): Partial<ModeConfig> {
		const config: Partial<ModeConfig> = { slug }

		// Extract title/name from first heading
		const titleMatch = content.match(/^#\s+(.+)$/m)
		if (titleMatch) {
			config.name = titleMatch[1].trim()
		}

		// Extract role definition
		const roleMatch = content.match(/##\s+Role Definition\s*\n\n([\s\S]*?)(?=\n##|$)/i)
		if (roleMatch) {
			config.roleDefinition = roleMatch[1].trim()
		}

		// Extract when to use
		const whenMatch = content.match(/##\s+When to Use\s*\n\n([\s\S]*?)(?=\n##|$)/i)
		if (whenMatch) {
			config.whenToUse = whenMatch[1].trim()
		}

		// Extract overview/description
		const overviewMatch = content.match(/##\s+Overview\s*\n\n([\s\S]*?)(?=\n##|$)/i)
		if (overviewMatch) {
			config.description = overviewMatch[1].trim()
		}

		// Extract custom instructions
		const instructionsMatch = content.match(/##\s+Custom Instructions\s*\n\n([\s\S]*?)(?=\n##|$)/i)
		if (instructionsMatch) {
			const instructions = instructionsMatch[1].trim()
			if (instructions && instructions !== "No custom instructions") {
				config.customInstructions = instructions
			}
		}

		// Extract permissions/groups from "Permissions & Tool Access" section
		const permissionsMatch = content.match(/##\s+Permissions & Tool Access\s*\n\n([\s\S]*?)(?=\n##|$)/i)
		if (permissionsMatch) {
			const permissionsText = permissionsMatch[1]
			const groups: ModeConfig["groups"] = []

			// Parse simple permissions (lines starting with -)
			const simplePerms = permissionsText.match(/^-\s+(\w+)\s*$/gm)
			if (simplePerms) {
				simplePerms.forEach((line) => {
					const perm = line.replace(/^-\s+/, "").trim()
					if (perm && !line.includes("[")) {
						// Type is validated by modeConfigSchema.safeParse() later
						groups.push(perm as ModeConfig["groups"][number])
					}
				})
			}

			// Parse complex permissions with restrictions (multi-line format)
			const complexPermPattern =
				/^-\s+(\w+)\s*\n\s+\[\s*\n\s+"(\w+)",\s*\n\s+\{[\s\S]*?"fileRegex":\s*"([^"]+)"[\s\S]*?"description":\s*"([^"]+)"[\s\S]*?\}\s*\n\s+\]/gm
			let complexMatch
			while ((complexMatch = complexPermPattern.exec(permissionsText)) !== null) {
				const [, , tool, fileRegex, description] = complexMatch
				// Type is validated by modeConfigSchema.safeParse() later
				groups.push([tool, { fileRegex, description }] as ModeConfig["groups"][number])
			}

			if (groups.length > 0) {
				config.groups = groups
			}
		}

		return config
	}

	/**
	 * Load modes from .specify/config.yml and corresponding markdown files
	 */
	private async loadSpecifyModes(): Promise<ModeConfig[]> {
		const specifyConfigPath = await this.getSpecifyConfigPath()
		const specifyModesDir = await this.getSpecifyModesDir()

		if (!specifyConfigPath) {
			return []
		}

		try {
			const content = await fs.readFile(specifyConfigPath, "utf-8")
			const config = this.parseYamlSafely(content, specifyConfigPath)

			if (!config || !config.modes || !Array.isArray(config.modes)) {
				return []
			}

			const modes: ModeConfig[] = []

			for (const modeEntry of config.modes) {
				if (!modeEntry.slug) {
					continue
				}

				// Start with config.yml data
				let modeConfig: ModeConfig = {
					slug: modeEntry.slug,
					name: modeEntry.name || modeEntry.slug,
					roleDefinition: modeEntry.roleDefinition || "",
					groups: modeEntry.groups || ["read"],
					source: "project" as const,
				}

				// Add optional fields from config.yml
				if (modeEntry.description) {
					modeConfig.description = modeEntry.description
				}
				if (modeEntry.whenToUse) {
					modeConfig.whenToUse = modeEntry.whenToUse
				}
				if (modeEntry.customInstructions) {
					modeConfig.customInstructions = modeEntry.customInstructions
				}

				// Try to load and merge markdown specification
				if (specifyModesDir) {
					try {
						// Security: Validate path to prevent traversal attacks
						const mdPath = this.validateSafePath(specifyModesDir, `${modeEntry.slug}.md`)
						const mdExists = await fileExistsAtPath(mdPath)

						if (mdExists) {
							const mdContent = await fs.readFile(mdPath, "utf-8")
							const mdConfig = this.parseModeSpecification(mdContent, modeEntry.slug)

							// Merge markdown config with config.yml (config.yml takes precedence for explicit values)
							modeConfig = {
								...mdConfig,
								...modeConfig,
								// For roleDefinition, prefer markdown if config.yml is empty
								roleDefinition: modeConfig.roleDefinition || mdConfig.roleDefinition || "",
								// Merge groups if markdown provides them and config.yml doesn't
								groups: modeConfig.groups?.length ? modeConfig.groups : mdConfig.groups || ["read"],
							}
						}
					} catch (error) {
						// Handle both SecurityError and file read errors
						if (error instanceof SecurityError) {
							logger.error(`[Security] Mode specification blocked for ${modeEntry.slug}:`, {
								error: error.message,
							})
						} else {
							logger.warn(
								`Failed to load mode specification for ${modeEntry.slug}: ${error instanceof Error ? error.message : String(error)}`,
							)
						}
					}
				}

				// Validate the final mode config
				const validationResult = modeConfigSchema.safeParse(modeConfig)
				if (validationResult.success) {
					modes.push(validationResult.data)
				} else {
					logger.warn(`Invalid mode configuration for ${modeEntry.slug}:`, {
						errors: validationResult.error.errors,
					})
				}
			}

			return modes
		} catch (error) {
			logger.warn(`Failed to load Spec-Kit modes: ${error instanceof Error ? error.message : String(error)}`)
			return []
		}
	}

	/**
	 * Regex pattern for problematic characters that need to be cleaned from YAML content
	 * Includes:
	 * - \u00A0: Non-breaking space
	 * - \u200B-\u200D: Zero-width spaces and joiners
	 * - \u2010-\u2015, \u2212: Various dash characters
	 * - \u2018-\u2019: Smart single quotes
	 * - \u201C-\u201D: Smart double quotes
	 */
	private static readonly PROBLEMATIC_CHARS_REGEX =
		// eslint-disable-next-line no-misleading-character-class
		/[\u00A0\u200B\u200C\u200D\u2010\u2011\u2012\u2013\u2014\u2015\u2212\u2018\u2019\u201C\u201D]/g

	/**
	 * Clean invisible and problematic characters from YAML content
	 */
	private cleanInvisibleCharacters(content: string): string {
		// Single pass replacement for all problematic characters
		return content.replace(CustomModesManager.PROBLEMATIC_CHARS_REGEX, (match) => {
			switch (match) {
				case "\u00A0": // Non-breaking space
					return " "
				case "\u200B": // Zero-width space
				case "\u200C": // Zero-width non-joiner
				case "\u200D": // Zero-width joiner
					return ""
				case "\u2018": // Left single quotation mark
				case "\u2019": // Right single quotation mark
					return "'"
				case "\u201C": // Left double quotation mark
				case "\u201D": // Right double quotation mark
					return '"'
				default: // Dash characters (U+2010 through U+2015, U+2212)
					return "-"
			}
		})
	}

	/**
	 * Parse YAML content with enhanced error handling and preprocessing
	 * Includes security protections against YAML bombs and oversized content
	 */
	private parseYamlSafely(content: string, filePath: string): any {
		// Security: Check raw content size to prevent memory exhaustion
		if (content.length > MAX_YAML_SIZE) {
			const errorMsg = `YAML file too large: ${filePath} (${content.length} bytes, max ${MAX_YAML_SIZE})`
			logger.warn("[Security] YAML file too large", {
				filePath,
				size: content.length,
				maxSize: MAX_YAML_SIZE,
			})
			throw new SecurityError(errorMsg)
		}

		// Clean the content
		let cleanedContent = stripBom(content)
		cleanedContent = this.cleanInvisibleCharacters(cleanedContent)

		try {
			// Parse with security limits to prevent YAML bombs (billion laughs attack)
			const parsed = yaml.parse(cleanedContent, {
				maxAliasCount: MAX_YAML_ALIAS_COUNT,
				strict: true,
			})

			// Security: Sanitize to prevent prototype pollution (CWE-1321)
			const sanitized = this.sanitizeObject(parsed ?? {})

			// Security: Check expanded size after parsing
			const jsonStr = JSON.stringify(sanitized)
			if (jsonStr.length > MAX_EXPANDED_SIZE) {
				const errorMsg = `Parsed YAML too large: ${filePath} (${jsonStr.length} bytes expanded, max ${MAX_EXPANDED_SIZE})`
				logger.warn("[Security] Parsed YAML too large", {
					filePath,
					expandedSize: jsonStr.length,
					maxExpandedSize: MAX_EXPANDED_SIZE,
				})
				throw new SecurityError(errorMsg)
			}

			// Return sanitized object
			return sanitized
		} catch (yamlError) {
			// For .modes files, try JSON as fallback
			if (filePath.endsWith(MODES_FILENAME)) {
				try {
					// Try parsing the original content as JSON (not the cleaned content)
					return JSON.parse(content)
				} catch (jsonError) {
					// JSON also failed, show the original YAML error
					const errorMsg = yamlError instanceof Error ? yamlError.message : String(yamlError)
					console.error(`[CustomModesManager] Failed to parse YAML from ${filePath}:`, errorMsg)

					const lineMatch = errorMsg.match(/at line (\d+)/)
					const line = lineMatch ? lineMatch[1] : "unknown"
					vscode.window.showErrorMessage(t("common:customModes.errors.yamlParseError", { line }))

					// Return empty object to prevent duplicate error handling
					return {}
				}
			}

			// For non-.modes files, just log and return empty object
			const errorMsg = yamlError instanceof Error ? yamlError.message : String(yamlError)
			console.error(`[CustomModesManager] Failed to parse YAML from ${filePath}:`, errorMsg)
			return {}
		}
	}

	private async loadModesFromFile(filePath: string): Promise<ModeConfig[]> {
		try {
			const content = await fs.readFile(filePath, "utf-8")
			const settings = this.parseYamlSafely(content, filePath)

			// Ensure settings has customModes property
			if (!settings || typeof settings !== "object" || !settings.customModes) {
				return []
			}

			const result = customModesSettingsSchema.safeParse(settings)

			if (!result.success) {
				console.error(`[CustomModesManager] Schema validation failed for ${filePath}:`, result.error)

				// Show user-friendly error for .modes files
				if (filePath.endsWith(MODES_FILENAME)) {
					const issues = result.error.issues
						.map((issue) => `• ${issue.path.join(".")}: ${issue.message}`)
						.join("\n")

					vscode.window.showErrorMessage(t("common:customModes.errors.schemaValidationError", { issues }))
				}

				return []
			}

			// Determine source based on file path
			const isRoo = filePath.endsWith(MODES_FILENAME)
			const source = isRoo ? ("project" as const) : ("global" as const)

			// Add source to each mode
			return result.data.customModes.map((mode) => ({ ...mode, source }))
		} catch (error) {
			// Only log if the error wasn't already handled in parseYamlSafely
			if (!(error as any).alreadyHandled) {
				const errorMsg = `Failed to load modes from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
				console.error(`[CustomModesManager] ${errorMsg}`)
			}
			return []
		}
	}

	private async mergeCustomModes(projectModes: ModeConfig[], globalModes: ModeConfig[]): Promise<ModeConfig[]> {
		const slugs = new Set<string>()
		const merged: ModeConfig[] = []

		// Add project mode (takes precedence)
		for (const mode of projectModes) {
			if (!slugs.has(mode.slug)) {
				slugs.add(mode.slug)
				merged.push({ ...mode, source: "project" })
			}
		}

		// Add non-duplicate global modes
		for (const mode of globalModes) {
			if (!slugs.has(mode.slug)) {
				slugs.add(mode.slug)
				merged.push({ ...mode, source: "global" })
			}
		}

		return merged
	}

	public async getCustomModesFilePath(): Promise<string> {
		const settingsDir = await ensureSettingsDirectoryExists(this.context)
		const filePath = path.join(settingsDir, GlobalFileNames.customModes)
		const fileExists = await fileExistsAtPath(filePath)

		if (!fileExists) {
			await this.queueWrite(() => fs.writeFile(filePath, yaml.stringify({ customModes: [] }, { lineWidth: 0 })))
		}

		return filePath
	}

	private async watchCustomModesFiles(): Promise<void> {
		// Skip if test environment is detected
		if (process.env.NODE_ENV === "test") {
			return
		}

		const settingsPath = await this.getCustomModesFilePath()

		// Watch settings file
		const settingsWatcher = vscode.workspace.createFileSystemWatcher(settingsPath)

		const handleSettingsChange = async () => {
			try {
				// Ensure that the settings file exists (especially important for delete events)
				await this.getCustomModesFilePath()
				const content = await fs.readFile(settingsPath, "utf-8")

				const errorMessage = t("common:customModes.errors.invalidFormat")

				let config: any

				try {
					config = this.parseYamlSafely(content, settingsPath)
				} catch (error) {
					console.error(error)
					vscode.window.showErrorMessage(errorMessage)
					return
				}

				const result = customModesSettingsSchema.safeParse(config)

				if (!result.success) {
					vscode.window.showErrorMessage(errorMessage)
					return
				}

				// Get modes from .modes if it exists (takes precedence)
				const modesPath = await this.getWorkspaceModes()
				const legacyModes = modesPath ? await this.loadModesFromFile(modesPath) : []

				// Merge modes from both sources (.modes takes precedence)
				const mergedModes = await this.mergeCustomModes(legacyModes, result.data.customModes)
				await this.context.globalState.update("customModes", mergedModes)
				this.clearCache()
				await this.onUpdate()
			} catch (error) {
				console.error(`[CustomModesManager] Error handling settings file change:`, error)
			}
		}

		this.disposables.push(settingsWatcher.onDidChange(handleSettingsChange))
		this.disposables.push(settingsWatcher.onDidCreate(handleSettingsChange))
		this.disposables.push(settingsWatcher.onDidDelete(handleSettingsChange))
		this.disposables.push(settingsWatcher)

		// Watch .modes file - watch the path even if it doesn't exist yet
		const workspaceFolders = vscode.workspace.workspaceFolders
		if (workspaceFolders && workspaceFolders.length > 0) {
			const workspaceRoot = getWorkspacePath()
			const modesPath = path.join(workspaceRoot, MODES_FILENAME)
			const modesWatcher = vscode.workspace.createFileSystemWatcher(modesPath)

			const handleModesChange = async () => {
				try {
					const settingsModes = await this.loadModesFromFile(settingsPath)
					const legacyModes = await this.loadModesFromFile(modesPath)
					// .modes takes precedence
					const mergedModes = await this.mergeCustomModes(legacyModes, settingsModes)
					await this.context.globalState.update("customModes", mergedModes)
					this.clearCache()
					await this.onUpdate()
				} catch (error) {
					console.error(`[CustomModesManager] Error handling .modes file change:`, error)
				}
			}

			this.disposables.push(modesWatcher.onDidChange(handleModesChange))
			this.disposables.push(modesWatcher.onDidCreate(handleModesChange))
			this.disposables.push(
				modesWatcher.onDidDelete(async () => {
					// When .modes is deleted, refresh with only settings modes
					try {
						const settingsModes = await this.loadModesFromFile(settingsPath)
						await this.context.globalState.update("customModes", settingsModes)
						this.clearCache()
						await this.onUpdate()
					} catch (error) {
						console.error(`[CustomModesManager] Error handling .modes file deletion:`, error)
					}
				}),
			)
			this.disposables.push(modesWatcher)

			// Watch .specify/config.yml file
			const specifyConfigPath = path.join(workspaceRoot, SPECIFY_CONFIG_PATH)
			const specifyWatcher = vscode.workspace.createFileSystemWatcher(specifyConfigPath)

			const handleSpecifyChange = async () => {
				try {
					// Clear cache to force reload
					this.clearCache()
					await this.onUpdate()
				} catch (error) {
					console.error(`[CustomModesManager] Error handling .specify/config.yml change:`, error)
				}
			}

			this.disposables.push(specifyWatcher.onDidChange(handleSpecifyChange))
			this.disposables.push(specifyWatcher.onDidCreate(handleSpecifyChange))
			this.disposables.push(specifyWatcher.onDidDelete(handleSpecifyChange))
			this.disposables.push(specifyWatcher)

			// Watch .specify/memory/specifications/modes directory for changes to markdown files
			const specifyModesGlob = new vscode.RelativePattern(workspaceRoot, `${SPECIFY_MODES_DIR}/**/*.md`)
			const specifyModesWatcher = vscode.workspace.createFileSystemWatcher(specifyModesGlob)

			const handleSpecifyModesChange = async () => {
				try {
					// Clear cache to force reload
					this.clearCache()
					await this.onUpdate()
				} catch (error) {
					console.error(`[CustomModesManager] Error handling mode specification change:`, error)
				}
			}

			this.disposables.push(specifyModesWatcher.onDidChange(handleSpecifyModesChange))
			this.disposables.push(specifyModesWatcher.onDidCreate(handleSpecifyModesChange))
			this.disposables.push(specifyModesWatcher.onDidDelete(handleSpecifyModesChange))
			this.disposables.push(specifyModesWatcher)
		}
	}

	public async getCustomModes(): Promise<ModeConfig[]> {
		// Check if we have a valid cached result.
		const now = Date.now()

		if (this.cachedModes && now - this.cachedAt < CustomModesManager.cacheTTL) {
			return this.cachedModes
		}

		// Get modes from settings file (global).
		const settingsPath = await this.getCustomModesFilePath()
		const settingsModes = await this.loadModesFromFile(settingsPath)

		// Get modes from spec-kit (.specify/config.yml + markdown specs).
		const specifyModes = await this.loadSpecifyModes()

		// Get modes from .modes if it exists (legacy project modes for backward compatibility).
		const modesPath = await this.getWorkspaceModes()
		const legacyModes = modesPath ? await this.loadModesFromFile(modesPath) : []

		// Create a map to track which slugs are taken by project modes.
		const projectSlugs = new Set<string>()

		// Priority order for project modes:
		// 1. .modes (legacy format, takes highest precedence for backward compatibility)
		// 2. spec-kit modes (.specify/config.yml + markdown) - preferred modern format
		const allProjectModes: ModeConfig[] = []

		// Add .modes modes first (highest priority for project modes during migration)
		for (const mode of legacyModes) {
			if (!projectSlugs.has(mode.slug)) {
				projectSlugs.add(mode.slug)
				allProjectModes.push({ ...mode, source: "project" as const })
			}
		}

		// Add spec-kit modes (only if slug not already taken by .modes)
		for (const mode of specifyModes) {
			if (!projectSlugs.has(mode.slug)) {
				projectSlugs.add(mode.slug)
				allProjectModes.push({ ...mode, source: "project" as const })
			}
		}

		// Combine modes: project modes first, then global modes that don't conflict
		const mergedModes = [
			...allProjectModes,
			...settingsModes
				.filter((mode) => !projectSlugs.has(mode.slug))
				.map((mode) => ({ ...mode, source: "global" as const })),
		]

		await this.context.globalState.update("customModes", mergedModes)

		this.cachedModes = mergedModes
		this.cachedAt = now

		return mergedModes
	}

	public async updateCustomMode(slug: string, config: ModeConfig): Promise<void> {
		try {
			// Validate the mode configuration before saving
			const validationResult = modeConfigSchema.safeParse(config)
			if (!validationResult.success) {
				const errorMessages = validationResult.error.errors
					.map((err) => `${err.path.join(".")}: ${err.message}`)
					.join(", ")
				const errorMessage = `Invalid mode configuration: ${errorMessages}`
				logger.error("Mode validation failed", { slug, errors: validationResult.error.errors })
				vscode.window.showErrorMessage(t("common:customModes.errors.updateFailed", { error: errorMessage }))
				return
			}

			const isProjectMode = config.source === "project"
			let targetPath: string

			if (isProjectMode) {
				const workspaceFolders = vscode.workspace.workspaceFolders

				if (!workspaceFolders || workspaceFolders.length === 0) {
					logger.error("Failed to update project mode: No workspace folder found", { slug })
					throw new Error(t("common:customModes.errors.noWorkspaceForProject"))
				}

				const workspaceRoot = getWorkspacePath()
				targetPath = path.join(workspaceRoot, MODES_FILENAME)
				const exists = await fileExistsAtPath(targetPath)

				logger.info(`${exists ? "Updating" : "Creating"} project mode in ${MODES_FILENAME}`, {
					slug,
					workspace: workspaceRoot,
				})
			} else {
				targetPath = await this.getCustomModesFilePath()
			}

			await this.queueWrite(async () => {
				// Ensure source is set correctly based on target file.
				const modeWithSource = {
					...config,
					source: isProjectMode ? ("project" as const) : ("global" as const),
				}

				await this.updateModesInFile(targetPath, (modes) => {
					const updatedModes = modes.filter((m) => m.slug !== slug)
					updatedModes.push(modeWithSource)
					return updatedModes
				})

				this.clearCache()
				await this.refreshMergedState()
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			logger.error("Failed to update custom mode", { slug, error: errorMessage })
			vscode.window.showErrorMessage(t("common:customModes.errors.updateFailed", { error: errorMessage }))
		}
	}

	private async updateModesInFile(filePath: string, operation: (modes: ModeConfig[]) => ModeConfig[]): Promise<void> {
		let content = "{}"

		try {
			content = await fs.readFile(filePath, "utf-8")
		} catch (error) {
			// File might not exist yet.
			content = yaml.stringify({ customModes: [] }, { lineWidth: 0 })
		}

		let settings

		try {
			settings = this.parseYamlSafely(content, filePath)
		} catch (error) {
			// Error already logged in parseYamlSafely
			settings = { customModes: [] }
		}

		// Ensure settings is an object and has customModes property
		if (!settings || typeof settings !== "object") {
			settings = { customModes: [] }
		}
		if (!settings.customModes) {
			settings.customModes = []
		}

		settings.customModes = operation(settings.customModes)
		await fs.writeFile(filePath, yaml.stringify(settings, { lineWidth: 0 }), "utf-8")
	}

	private async refreshMergedState(): Promise<void> {
		const settingsPath = await this.getCustomModesFilePath()
		const modesPath = await this.getWorkspaceModes()

		const settingsModes = await this.loadModesFromFile(settingsPath)
		const legacyModes = modesPath ? await this.loadModesFromFile(modesPath) : []
		const mergedModes = await this.mergeCustomModes(legacyModes, settingsModes)

		await this.context.globalState.update("customModes", mergedModes)

		this.clearCache()

		await this.onUpdate()
	}

	public async deleteCustomMode(slug: string, fromMarketplace = false): Promise<void> {
		try {
			const settingsPath = await this.getCustomModesFilePath()
			const modesPath = await this.getWorkspaceModes()

			const settingsModes = await this.loadModesFromFile(settingsPath)
			const legacyModes = modesPath ? await this.loadModesFromFile(modesPath) : []

			// Find the mode in either file
			const projectMode = legacyModes.find((m) => m.slug === slug)
			const globalMode = settingsModes.find((m) => m.slug === slug)

			if (!projectMode && !globalMode) {
				throw new Error(t("common:customModes.errors.modeNotFound"))
			}

			// Determine which mode to use for rules folder path calculation
			const modeToDelete = projectMode || globalMode

			await this.queueWrite(async () => {
				// Delete from project first if it exists there
				if (projectMode && modesPath) {
					await this.updateModesInFile(modesPath, (modes) => modes.filter((m) => m.slug !== slug))
				}

				// Delete from global settings if it exists there
				if (globalMode) {
					await this.updateModesInFile(settingsPath, (modes) => modes.filter((m) => m.slug !== slug))
				}

				// Delete associated rules folder
				if (modeToDelete) {
					await this.deleteRulesFolder(slug, modeToDelete, fromMarketplace)
				}

				// Clear cache when modes are deleted
				this.clearCache()
				await this.refreshMergedState()
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(t("common:customModes.errors.deleteFailed", { error: errorMessage }))
		}
	}

	/**
	 * Deletes the rules folder for a specific mode
	 * @param slug - The mode slug
	 * @param mode - The mode configuration to determine the scope
	 */
	private async deleteRulesFolder(slug: string, mode: ModeConfig, fromMarketplace = false): Promise<void> {
		try {
			// Determine the scope based on source (project or global)
			const scope = mode.source || "global"

			// Determine the rules folder path
			let rulesFolderPath: string
			if (scope === "project") {
				const workspacePath = getWorkspacePath()
				if (workspacePath) {
					rulesFolderPath = path.join(workspacePath, ".modes", `rules-${slug}`)
				} else {
					return // No workspace, can't delete project rules
				}
			} else {
				// Global scope - use OS home directory
				const homeDir = os.homedir()
				rulesFolderPath = path.join(homeDir, ".modes", `rules-${slug}`)
			}

			// Check if the rules folder exists and delete it
			const rulesFolderExists = await fileExistsAtPath(rulesFolderPath)
			if (rulesFolderExists) {
				try {
					await fs.rm(rulesFolderPath, { recursive: true, force: true })
					logger.info(`Deleted rules folder for mode ${slug}: ${rulesFolderPath}`)
				} catch (error) {
					logger.error(`Failed to delete rules folder for mode ${slug}: ${error}`)
					// Notify the user about the failure
					const messageKey = fromMarketplace
						? "common:marketplace.mode.rulesCleanupFailed"
						: "common:customModes.errors.rulesCleanupFailed"
					vscode.window.showWarningMessage(t(messageKey, { rulesFolderPath }))
					// Continue even if folder deletion fails
				}
			}
		} catch (error) {
			logger.error(`Error deleting rules folder for mode ${slug}`, {
				error: error instanceof Error ? error.message : String(error),
			})
		}
	}

	public async resetCustomModes(): Promise<void> {
		try {
			const filePath = await this.getCustomModesFilePath()
			await fs.writeFile(filePath, yaml.stringify({ customModes: [] }, { lineWidth: 0 }))
			await this.context.globalState.update("customModes", [])
			this.clearCache()
			await this.onUpdate()
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(t("common:customModes.errors.resetFailed", { error: errorMessage }))
		}
	}

	/**
	 * Checks if a mode has associated rules files in the .modes/rules-{slug}/ directory
	 * @param slug - The mode identifier to check
	 * @returns True if the mode has rules files with content, false otherwise
	 */
	public async checkRulesDirectoryHasContent(slug: string): Promise<boolean> {
		try {
			// First, find the mode to determine its source
			const allModes = await this.getCustomModes()
			const mode = allModes.find((m) => m.slug === slug)

			if (!mode) {
				// If not in custom modes, check if it's in .modes (project-specific)
				const workspacePath = getWorkspacePath()
				if (!workspacePath) {
					return false
				}

				const modesPath = path.join(workspacePath, MODES_FILENAME)
				try {
					const modesExists = await fileExistsAtPath(modesPath)
					if (modesExists) {
						const modesContent = await fs.readFile(modesPath, "utf-8")
						const modesData = yaml.parse(modesContent)
						const legacyModes = modesData?.customModes || []

						// Check if this specific mode exists in .modes
						const modeInLegacy = legacyModes.find((m: any) => m.slug === slug)
						if (!modeInLegacy) {
							return false // Mode not found anywhere
						}
					} else {
						return false // No .modes file and not in custom modes
					}
				} catch (error) {
					return false // Cannot read .modes and not in custom modes
				}
			}

			// Determine the correct rules directory based on mode source
			let modeRulesDir: string
			const isGlobalMode = mode?.source === "global"

			if (isGlobalMode) {
				// For global modes, check in global .modes directory
				const globalRooDir = getGlobalRooDirectory()
				modeRulesDir = path.join(globalRooDir, `rules-${slug}`)
			} else {
				// For project modes, check in workspace .modes directory
				const workspacePath = getWorkspacePath()
				if (!workspacePath) {
					return false
				}
				modeRulesDir = path.join(workspacePath, ".modes", `rules-${slug}`)
			}

			try {
				const stats = await fs.stat(modeRulesDir)
				if (!stats.isDirectory()) {
					return false
				}
			} catch (error) {
				return false
			}

			// Check if directory has any content files
			try {
				const entries = await fs.readdir(modeRulesDir, { withFileTypes: true })

				for (const entry of entries) {
					if (entry.isFile()) {
						// Use path.join with modeRulesDir and entry.name for compatibility
						const filePath = path.join(modeRulesDir, entry.name)
						const content = await fs.readFile(filePath, "utf-8")
						if (content.trim()) {
							return true // Found at least one file with content
						}
					}
				}

				return false // No files with content found
			} catch (error) {
				return false
			}
		} catch (error) {
			logger.error("Failed to check rules directory for mode", {
				slug,
				error: error instanceof Error ? error.message : String(error),
			})
			return false
		}
	}

	/**
	 * Exports a mode configuration with its associated rules files into a shareable YAML format
	 * @param slug - The mode identifier to export
	 * @param customPrompts - Optional custom prompts to merge into the export
	 * @returns Success status with YAML content or error message
	 */
	public async exportModeWithRules(slug: string, customPrompts?: PromptComponent): Promise<ExportResult> {
		try {
			// Import modes from shared to check built-in modes
			const { modes: builtInModes } = await import("../../shared/modes")

			// Get all current modes
			const allModes = await this.getCustomModes()
			let mode = allModes.find((m) => m.slug === slug)

			// If mode not found in custom modes, check if it's a built-in mode that has been customized
			if (!mode) {
				// Only check workspace-based modes if workspace is available
				const workspacePath = getWorkspacePath()
				if (workspacePath) {
					const modesPath = path.join(workspacePath, MODES_FILENAME)
					try {
						const modesExists = await fileExistsAtPath(modesPath)
						if (modesExists) {
							const modesContent = await fs.readFile(modesPath, "utf-8")
							const modesData = yaml.parse(modesContent)
							const legacyModes = modesData?.customModes || []

							// Find the mode in .modes
							mode = legacyModes.find((m: any) => m.slug === slug)
						}
					} catch (error) {
						// Continue to check built-in modes
					}
				}

				// If still not found, check if it's a built-in mode
				if (!mode) {
					const builtInMode = builtInModes.find((m) => m.slug === slug)
					if (builtInMode) {
						// Use the built-in mode as the base
						mode = { ...builtInMode }
					} else {
						return { success: false, error: "Mode not found" }
					}
				}
			}

			// Determine the base directory based on mode source
			const isGlobalMode = mode.source === "global"
			let baseDir: string
			if (isGlobalMode) {
				// For global modes, use the global .modes directory
				baseDir = getGlobalRooDirectory()
			} else {
				// For project modes, use the workspace directory
				const workspacePath = getWorkspacePath()
				if (!workspacePath) {
					return { success: false, error: "No workspace found" }
				}
				baseDir = workspacePath
			}

			// Check for .modes/rules-{slug}/ directory (or rules-{slug}/ for global)
			const modeRulesDir = isGlobalMode
				? path.join(baseDir, `rules-${slug}`)
				: path.join(baseDir, ".modes", `rules-${slug}`)

			let rulesFiles: RuleFile[] = []
			try {
				const stats = await fs.stat(modeRulesDir)
				if (stats.isDirectory()) {
					// Extract content specific to this mode by looking for the mode-specific rules
					const entries = await fs.readdir(modeRulesDir, { withFileTypes: true })

					for (const entry of entries) {
						if (entry.isFile()) {
							// Use path.join with modeRulesDir and entry.name for compatibility
							const filePath = path.join(modeRulesDir, entry.name)
							const content = await fs.readFile(filePath, "utf-8")
							if (content.trim()) {
								// Calculate relative path from within the rules directory
								// This excludes the rules-{slug} folder from the path
								const relativePath = path.relative(modeRulesDir, filePath)
								// Normalize path to use forward slashes for cross-platform compatibility
								const normalizedRelativePath = relativePath.replace(/\\/g, "/")
								rulesFiles.push({ relativePath: normalizedRelativePath, content: content.trim() })
							}
						}
					}
				}
			} catch (error) {
				// Directory doesn't exist, which is fine - mode might not have rules
			}

			// Create an export mode with rules files preserved
			const exportMode: ExportedModeConfig = {
				...mode,
				// Remove source property for export
				source: "project" as const,
			}

			// Merge custom prompts if provided
			if (customPrompts) {
				if (customPrompts.roleDefinition) exportMode.roleDefinition = customPrompts.roleDefinition
				if (customPrompts.description) exportMode.description = customPrompts.description
				if (customPrompts.whenToUse) exportMode.whenToUse = customPrompts.whenToUse
				if (customPrompts.customInstructions) exportMode.customInstructions = customPrompts.customInstructions
			}

			// Add rules files if any exist
			if (rulesFiles.length > 0) {
				exportMode.rulesFiles = rulesFiles
			}

			// Generate YAML
			const exportData = {
				customModes: [exportMode],
			}

			const yamlContent = yaml.stringify(exportData)

			return { success: true, yaml: yamlContent }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			logger.error("Failed to export mode with rules", { slug, error: errorMessage })
			return { success: false, error: errorMessage }
		}
	}

	/**
	 * Helper method to import rules files for a mode
	 * @param importMode - The mode being imported
	 * @param rulesFiles - The rules files to import
	 * @param source - The import source ("global" or "project")
	 */
	private async importRulesFiles(
		importMode: ExportedModeConfig,
		rulesFiles: RuleFile[],
		source: "global" | "project",
	): Promise<void> {
		// Determine base directory and rules folder path based on source
		let baseDir: string
		let rulesFolderPath: string

		if (source === "global") {
			baseDir = getGlobalRooDirectory()
			rulesFolderPath = path.join(baseDir, `rules-${importMode.slug}`)
		} else {
			const workspacePath = getWorkspacePath()
			baseDir = path.join(workspacePath, ".modes")
			rulesFolderPath = path.join(baseDir, `rules-${importMode.slug}`)
		}

		// Always remove the existing rules folder for this mode if it exists
		// This ensures that if the imported mode has no rules, the folder is cleaned up
		try {
			await fs.rm(rulesFolderPath, { recursive: true, force: true })
			logger.info(`Removed existing ${source} rules folder for mode ${importMode.slug}`)
		} catch (error) {
			// It's okay if the folder doesn't exist
			logger.debug(`No existing ${source} rules folder to remove for mode ${importMode.slug}`)
		}

		// Only proceed with file creation if there are rules files to import
		if (!rulesFiles || !Array.isArray(rulesFiles) || rulesFiles.length === 0) {
			return
		}

		// Import the new rules files with path validation
		for (const ruleFile of rulesFiles) {
			if (ruleFile.relativePath && ruleFile.content) {
				// Validate the relative path to prevent path traversal attacks
				const normalizedRelativePath = path.normalize(ruleFile.relativePath)

				// Ensure the path doesn't contain traversal sequences
				if (normalizedRelativePath.includes("..") || path.isAbsolute(normalizedRelativePath)) {
					logger.error(`Invalid file path detected: ${ruleFile.relativePath}`)
					continue // Skip this file but continue with others
				}

				// Check if path starts with a rules-* folder (old export format)
				let cleanedRelativePath = normalizedRelativePath
				const rulesMatch = normalizedRelativePath.match(/^rules-[^\/\\]+[\/\\]/)
				if (rulesMatch) {
					// Strip the entire rules-* folder reference for backwards compatibility
					cleanedRelativePath = normalizedRelativePath.substring(rulesMatch[0].length)
					logger.info(`Detected old export format, stripping ${rulesMatch[0]} from path`)
				}

				// Use the rules folder path instead of base directory
				const targetPath = path.join(rulesFolderPath, cleanedRelativePath)
				const normalizedTargetPath = path.normalize(targetPath)
				const expectedBasePath = path.normalize(rulesFolderPath)

				// Ensure the resolved path stays within the rules folder
				if (!normalizedTargetPath.startsWith(expectedBasePath)) {
					logger.error(`Path traversal attempt detected: ${ruleFile.relativePath}`)
					continue // Skip this file but continue with others
				}

				// Ensure directory exists
				const targetDir = path.dirname(targetPath)
				await fs.mkdir(targetDir, { recursive: true })

				// Write the file
				await fs.writeFile(targetPath, ruleFile.content, "utf-8")
			}
		}
	}

	/**
	 * Imports modes from YAML content, including their associated rules files
	 * @param yamlContent - The YAML content containing mode configurations
	 * @param source - Target level for import: "global" (all projects) or "project" (current workspace only)
	 * @returns Success status with optional error message
	 */
	public async importModeWithRules(
		yamlContent: string,
		source: "global" | "project" = "project",
	): Promise<ImportResult> {
		try {
			// Parse the YAML content with proper type validation
			let importData: ImportData
			try {
				const parsed = yaml.parse(yamlContent)

				// Validate the structure
				if (!parsed?.customModes || !Array.isArray(parsed.customModes) || parsed.customModes.length === 0) {
					return { success: false, error: "Invalid import format: Expected 'customModes' array in YAML" }
				}

				importData = parsed as ImportData
			} catch (parseError) {
				return {
					success: false,
					error: `Invalid YAML format: ${parseError instanceof Error ? parseError.message : "Failed to parse YAML"}`,
				}
			}

			// Check workspace availability early if importing at project level
			if (source === "project") {
				const workspacePath = getWorkspacePath()
				if (!workspacePath) {
					return { success: false, error: "No workspace found" }
				}
			}

			// Process each mode in the import
			for (const importMode of importData.customModes) {
				const { rulesFiles, ...modeConfig } = importMode

				// Validate the mode configuration
				const validationResult = modeConfigSchema.safeParse(modeConfig)
				if (!validationResult.success) {
					logger.error(`Invalid mode configuration for ${modeConfig.slug}`, {
						errors: validationResult.error.errors,
					})
					return {
						success: false,
						error: `Invalid mode configuration for ${modeConfig.slug}: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
					}
				}

				// Check for existing mode conflicts
				const existingModes = await this.getCustomModes()
				const existingMode = existingModes.find((m) => m.slug === importMode.slug)
				if (existingMode) {
					logger.info(`Overwriting existing mode: ${importMode.slug}`)
				}

				// Import the mode configuration with the specified source
				await this.updateCustomMode(importMode.slug, {
					...modeConfig,
					source: source, // Use the provided source parameter
				})

				// Import rules files (this also handles cleanup of existing rules folders)
				await this.importRulesFiles(importMode, rulesFiles || [], source)
			}

			// Refresh the modes after import
			await this.refreshMergedState()

			return { success: true }
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			logger.error("Failed to import mode with rules", { error: errorMessage })
			return { success: false, error: errorMessage }
		}
	}

	private clearCache(): void {
		this.cachedModes = null
		this.cachedAt = 0
	}

	dispose(): void {
		for (const disposable of this.disposables) {
			disposable.dispose()
		}

		this.disposables = []
	}
}
