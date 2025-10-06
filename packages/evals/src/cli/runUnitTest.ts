import * as path from "path"

import { execa, parseCommandString } from "execa"
import psTree from "ps-tree"

import type { Task } from "../db/index.js"
import { type ExerciseLanguage, EVALS_REPO_PATH } from "../exercises/index.js"

import { Logger } from "./utils.js"

const UNIT_TEST_TIMEOUT = 2 * 60 * 1_000

const testCommands: Record<ExerciseLanguage, { commands: string[]; timeout?: number }> = {
	go: { commands: ["go test"] },
	java: { commands: ["./gradlew test"] },
	javascript: { commands: ["pnpm install", "pnpm test"] },
	python: { commands: ["uv run python3 -m pytest -o markers=task *_test.py"] },
	rust: { commands: ["cargo test"] },
}

type RunUnitTestOptions = {
	task: Task
	logger: Logger
}

/**
 * Validates that exercise name is safe (prevents path traversal)
 */
const validateExerciseName = (exercise: string): boolean => {
	// Only allow alphanumeric, hyphen, underscore
	return /^[a-zA-Z0-9_-]+$/.test(exercise)
}

/**
 * Safely kill process tree with proper error handling
 */
const killProcessTree = async (pid: number, logger: Logger): Promise<void> => {
	if (!pid) {
		logger.warn("Cannot kill process: pid is undefined")
		return
	}

	try {
		// Get all descendant processes
		const descendants = await new Promise<number[]>((resolve, reject) => {
			psTree(pid, (err, children) => {
				if (err) {
					reject(err)
				} else {
					resolve(children.map((p) => parseInt(p.PID)))
				}
			})
		})

		logger.info(`Killing process ${pid} with ${descendants.length} descendants`)

		// Kill descendants first (bottom-up)
		for (const descendantPid of descendants.reverse()) {
			try {
				process.kill(descendantPid, "SIGTERM")
				logger.info(`Sent SIGTERM to descendant ${descendantPid}`)
			} catch (error) {
				logger.warn(`Failed to kill descendant ${descendantPid}:`, error)
			}
		}

		// Wait briefly for graceful shutdown
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Force kill remaining processes
		for (const descendantPid of descendants.reverse()) {
			try {
				process.kill(descendantPid, "SIGKILL")
			} catch {
				// Process may already be dead, ignore
			}
		}

		// Finally kill the main process
		try {
			process.kill(pid, "SIGKILL")
			logger.info(`Killed main process ${pid}`)
		} catch (error) {
			logger.warn(`Failed to kill main process ${pid}:`, error)
		}
	} catch (error) {
		logger.error(`Failed to kill process tree for ${pid}:`, error)
	}
}

export const runUnitTest = async ({ task, logger }: RunUnitTestOptions) => {
	// Validate exercise name to prevent path traversal
	if (!validateExerciseName(task.exercise)) {
		logger.error(`Invalid exercise name: ${task.exercise}`)
		return false
	}

	const cmd = testCommands[task.language]
	const cwd = path.resolve(EVALS_REPO_PATH, task.language, task.exercise)
	const commands = cmd.commands.map((cs) => parseCommandString(cs))

	let passed = true
	let timeoutHandle: NodeJS.Timeout | undefined

	for (const command of commands) {
		try {
			logger.info(`running "${command.join(" ")}"`)
			const subprocess = execa({ cwd, shell: "/bin/bash", reject: false })`${command}`
			subprocess.stdout?.pipe(process.stdout)
			subprocess.stderr?.pipe(process.stderr)

			let timedOut = false

			// Create timeout promise
			const timeoutPromise = new Promise<void>((resolve) => {
				timeoutHandle = setTimeout(async () => {
					timedOut = true
					logger.warn(`"${command.join(" ")}" timed out after ${UNIT_TEST_TIMEOUT}ms`)

					if (subprocess.pid) {
						await killProcessTree(subprocess.pid, logger)
					}

					resolve()
				}, UNIT_TEST_TIMEOUT)
			})

			// Race between subprocess completion and timeout
			const result = await Promise.race([subprocess, timeoutPromise.then(() => null)])

			// Clear timeout if subprocess finished first
			if (timeoutHandle) {
				clearTimeout(timeoutHandle)
				timeoutHandle = undefined
			}

			// If timed out or failed, mark as not passed
			if (timedOut || !result || result.failed) {
				passed = false
				if (timedOut) {
					logger.error(`Command timed out: "${command.join(" ")}"`)
				} else if (result?.failed) {
					logger.error(`Command failed with exit code ${result.exitCode}: "${command.join(" ")}"`)
				}
				break
			}
		} catch (error) {
			logger.error(`Unexpected error running "${command.join(" ")}":`, error)
			passed = false
			break
		} finally {
			// Ensure timeout is always cleared
			if (timeoutHandle) {
				clearTimeout(timeoutHandle)
				timeoutHandle = undefined
			}
		}
	}

	return passed
}
