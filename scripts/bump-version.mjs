#!/usr/bin/env node

/**
 * Bump version script for RyCode-Ext
 * Auto-increments the patch version on each build
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const packageJsonPath = join(__dirname, '../src/package.json')

try {
	// Read package.json
	const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))

	// Parse current version
	const versionParts = packageJson.version.split('.')
	const major = parseInt(versionParts[0])
	const minor = parseInt(versionParts[1])
	const patch = parseInt(versionParts[2])

	// Increment patch version
	const newPatch = patch + 1
	const newVersion = `${major}.${minor}.${newPatch}`

	// Update version
	packageJson.version = newVersion

	// Write back to package.json
	writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n', 'utf8')

	console.log(`✅ Version bumped: ${versionParts.join('.')} → ${newVersion}`)
} catch (error) {
	console.error('❌ Failed to bump version:', error.message)
	process.exit(1)
}
