#!/usr/bin/env node

/**
 * RyCode-Ext to Spec-Kit Migration Script
 *
 * This script migrates .rycode-ext structure to .specify/memory/ spec-kit format
 */

const fs = require("fs")
const path = require("path")
const yaml = require("js-yaml")

const ROOT_DIR = path.join(__dirname, "..")
const RYCODE_EXT_DIR = path.join(ROOT_DIR, ".rycode-ext")
const SPECIFY_DIR = path.join(ROOT_DIR, ".specify")
const MODES_FILE = path.join(ROOT_DIR, ".rycodeextmodes")
const RULES_FILE = path.join(RYCODE_EXT_DIR, "rules", "rules.md")
const ROOMOTES_FILE = path.join(RYCODE_EXT_DIR, "roomotes.yml")

// Read and parse modes configuration
function parseModesConfig() {
	console.log("📖 Parsing .rycodeextmodes...")
	const content = fs.readFileSync(MODES_FILE, "utf8")
	const config = yaml.load(content)
	console.log(`✅ Found ${config.customModes.length} modes`)
	return config.customModes
}

// Read core principles from rules.md
function extractCorePrinciples() {
	console.log("📖 Extracting core principles...")
	if (!fs.existsSync(RULES_FILE)) {
		return "## I. Core Principles\n\n*No principles defined*\n"
	}
	const content = fs.readFileSync(RULES_FILE, "utf8")
	return `## I. Core Principles\n\n${content}\n`
}

// Convert XML rules to markdown (simplified - just reference them for now)
function convertXMLRules(modeSlug) {
	const rulesDir = path.join(RYCODE_EXT_DIR, `rules-${modeSlug}`)
	if (!fs.existsSync(rulesDir)) {
		return ""
	}

	const xmlFiles = fs.readdirSync(rulesDir).filter((f) => f.endsWith(".xml"))
	if (xmlFiles.length === 0) return ""

	let markdown = ""
	xmlFiles.forEach((file) => {
		const name = file.replace(/^\d+_/, "").replace(".xml", "").replace(/_/g, " ")
		const xmlPath = path.join(rulesDir, file)
		const xmlContent = fs.readFileSync(xmlPath, "utf8")

		// Simple XML to markdown conversion (extract text content)
		const textContent = xmlContent
			.replace(/<[^>]+>/g, "\n")
			.replace(/\n+/g, "\n")
			.trim()

		markdown += `\n### ${name.charAt(0).toUpperCase() + name.slice(1)}\n\n${textContent}\n`
	})

	return markdown
}

// Generate constitution.md
function generateConstitution(modes) {
	console.log("📝 Generating constitution.md...")

	let constitution = `# RyCode-Ext Development Constitution

*Generated from .rycode-ext migration*

---

`

	// Add core principles
	constitution += extractCorePrinciples()
	constitution += "\n---\n\n"

	// Add mode specifications
	constitution += "## II. Development Modes\n\n"
	constitution += `This project supports ${modes.length} specialized development modes:\n\n`

	modes.forEach((mode, index) => {
		constitution += `### ${index + 1}. ${mode.name}\n\n`
		constitution += `**Slug:** \`${mode.slug}\`\n\n`
		constitution += `**Role:** ${mode.roleDefinition}\n\n`
		constitution += `**When to Use:** ${mode.whenToUse}\n\n`
		constitution += `**Description:** ${mode.description}\n\n`

		if (mode.groups && mode.groups.length > 0) {
			constitution += `**Permissions:**\n`
			mode.groups.forEach((group) => {
				if (typeof group === "string") {
					constitution += `- ${group}\n`
				} else if (Array.isArray(group)) {
					group.forEach((item) => {
						if (typeof item === "string") {
							constitution += `- ${item}\n`
						} else if (item.fileRegex) {
							constitution += `- edit (${item.fileRegex}): ${item.description || "No description"}\n`
						}
					})
				}
			})
			constitution += "\n"
		}

		if (mode.customInstructions) {
			constitution += `**Custom Instructions:**\n\n${mode.customInstructions}\n\n`
		}

		// Add XML rules if they exist
		const xmlRules = convertXMLRules(mode.slug)
		if (xmlRules) {
			constitution += `**Additional Guidelines:**\n${xmlRules}\n`
		}

		constitution += "\n---\n\n"
	})

	// Write constitution
	const constitutionPath = path.join(SPECIFY_DIR, "memory", "constitution.md")
	fs.writeFileSync(constitutionPath, constitution)
	console.log(`✅ Constitution created: ${constitutionPath}`)

	return constitution
}

// Generate mode specifications
function generateModeSpecs(modes) {
	console.log("📝 Generating mode specifications...")

	modes.forEach((mode) => {
		const spec = `# ${mode.name} Specification

## Overview

${mode.description}

## Role Definition

${mode.roleDefinition}

## When to Use

${mode.whenToUse}

## Permissions & Tool Access

${mode.groups ? mode.groups.map((g) => (typeof g === "string" ? `- ${g}` : JSON.stringify(g, null, 2))).join("\n") : "No specific permissions"}

## Custom Instructions

${mode.customInstructions || "No custom instructions"}

${convertXMLRules(mode.slug)}
`

		const specPath = path.join(SPECIFY_DIR, "memory", "specifications", "modes", `${mode.slug}.md`)
		fs.writeFileSync(specPath, spec)
		console.log(`  ✅ Created: ${mode.slug}.md`)
	})

	console.log(`✅ Generated ${modes.length} mode specifications`)
}

// Migrate automation config
function migrateAutomation() {
	console.log("📝 Migrating automation configuration...")

	if (fs.existsSync(ROOMOTES_FILE)) {
		const roomotes = yaml.load(fs.readFileSync(ROOMOTES_FILE, "utf8"))

		let automationMd = `# GitHub Event Triggers

## Configuration

`

		if (roomotes.commands) {
			automationMd += `### Commands\n\n`
			roomotes.commands.forEach((cmd) => {
				automationMd += `- **${cmd.name}**\n`
				automationMd += `  - Run: \`${cmd.run}\`\n`
				automationMd += `  - Timeout: ${cmd.timeout}s\n`
				automationMd += `  - Phase: ${cmd.execution_phase}\n\n`
			})
		}

		if (roomotes.github_events) {
			automationMd += `### GitHub Events\n\n`
			roomotes.github_events.forEach((event) => {
				automationMd += `- **${event.event}** → \`${event.action.name}\`\n`
			})
		}

		const automationPath = path.join(SPECIFY_DIR, "memory", "automation", "github-event-triggers.md")
		fs.writeFileSync(automationPath, automationMd)
		console.log(`✅ Automation config migrated`)
	}

	// Migrate slash commands
	const commandsDir = path.join(RYCODE_EXT_DIR, "commands")
	if (fs.existsSync(commandsDir)) {
		const commandFiles = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".md"))

		let commandsMd = `# Slash Commands

## Available Commands

`

		commandFiles.forEach((file) => {
			const content = fs.readFileSync(path.join(commandsDir, file), "utf8")
			const name = file.replace(".md", "")
			commandsMd += `### /${name}\n\n${content}\n\n---\n\n`
		})

		// Add spec-kit native commands
		commandsMd += `## Spec-Kit Native Commands

### /constitution
Display the project constitution

### /specify <feature>
Create a new specification for a feature

### /plan <specification>
Generate an implementation plan from a specification

### /tasks <plan>
Break down a plan into actionable tasks
`

		const commandsPath = path.join(SPECIFY_DIR, "memory", "automation", "slash-commands.md")
		fs.writeFileSync(commandsPath, commandsMd)
		console.log(`✅ Slash commands migrated`)
	}
}

// Create config.yml
function createConfigYml(modes) {
	console.log("📝 Creating .specify/config.yml...")

	const config = {
		version: "1.0",
		modes: modes.map((m) => ({
			slug: m.slug,
			name: m.name,
			source: m.source || "project",
		})),
	}

	const configPath = path.join(SPECIFY_DIR, "config.yml")
	fs.writeFileSync(configPath, yaml.dump(config))
	console.log(`✅ Config created: ${configPath}`)
}

// Main migration function
async function migrate() {
	console.log("\n🚀 Starting RyCode-Ext → Spec-Kit Migration\n")
	console.log("=".repeat(50) + "\n")

	try {
		// Parse modes
		const modes = parseModesConfig()

		// Generate constitution
		generateConstitution(modes)

		// Generate mode specifications
		generateModeSpecs(modes)

		// Migrate automation
		migrateAutomation()

		// Create config.yml
		createConfigYml(modes)

		console.log("\n" + "=".repeat(50))
		console.log("\n✅ Migration completed successfully!\n")
		console.log("📁 New structure:")
		console.log("  .specify/")
		console.log("    ├── config.yml")
		console.log("    └── memory/")
		console.log("        ├── constitution.md")
		console.log("        ├── specifications/")
		console.log("        │   ├── modes/ (13 files)")
		console.log("        │   ├── workflows/")
		console.log("        │   └── patterns/")
		console.log("        ├── automation/")
		console.log("        ├── plans/")
		console.log("        └── tasks/")
		console.log("\n📝 Next steps:")
		console.log("  1. Review .specify/memory/constitution.md")
		console.log("  2. Update codebase references from .rycode-ext to .specify")
		console.log("  3. Run tests to validate migration")
	} catch (error) {
		console.error("\n❌ Migration failed:", error.message)
		console.error(error.stack)
		process.exit(1)
	}
}

// Run migration
if (require.main === module) {
	migrate()
}

module.exports = { migrate, parseModesConfig, generateConstitution }
