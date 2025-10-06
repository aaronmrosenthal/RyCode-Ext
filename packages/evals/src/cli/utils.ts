import * as fs from "fs"
import * as path from "path"

import { execa } from "execa"

import type { Run, Task } from "../db/index.js"

export const getTag = (caller: string, { run, task }: { run: Run; task?: Task }) =>
	task
		? `${caller} | pid:${process.pid} | run:${run.id} | task:${task.id} | ${task.language}/${task.exercise}`
		: `${caller} | pid:${process.pid} | run:${run.id}`

export const isDockerContainer = () => {
	try {
		return fs.existsSync("/.dockerenv")
	} catch (_error) {
		return false
	}
}

export const resetEvalsRepo = async ({ run, cwd }: { run: Run; cwd: string }) => {
	try {
		// Verify we're in a git repository
		await execa({ cwd })`git rev-parse --git-dir`

		// Verify main branch exists
		const { stdout: branches } = await execa({ cwd })`git branch -a`
		if (!branches.includes("main") && !branches.includes("remotes/origin/main")) {
			throw new Error("main branch does not exist")
		}

		// Set git config (use local scope to avoid global pollution)
		await execa({ cwd })`git config --local user.name "RyCode-Ext Bot"`
		await execa({ cwd })`git config --local user.email "evals-bot@roocode.com"`

		// Force checkout to reset any changes
		await execa({ cwd })`git checkout -f main`

		// Clean untracked files
		await execa({ cwd })`git clean -fd`

		// Create new branch for this run
		const branchName = `runs/${run.id}-${crypto.randomUUID().slice(0, 8)}`
		await execa({ cwd })`git checkout -b ${branchName}`
	} catch (error) {
		throw new Error(`Failed to reset evals repo: ${error}`)
	}
}

export const commitEvalsRepoChanges = async ({ run, cwd }: { run: Run; cwd: string }) => {
	try {
		// Check if there are any changes to commit
		const { stdout: status } = await execa({ cwd })`git status --porcelain`
		if (!status.trim()) {
			console.log("No changes to commit")
			return
		}

		await execa({ cwd })`git add .`
		await execa({ cwd })`git commit -m ${`Run #${run.id}`} --no-verify`
	} catch (error) {
		throw new Error(`Failed to commit evals repo changes: ${error}`)
	}
}

enum LogLevel {
	INFO = "INFO",
	ERROR = "ERROR",
	WARN = "WARN",
	DEBUG = "DEBUG",
}

interface LoggerOptions {
	logDir: string
	filename: string
	tag: string
}

export class Logger {
	private logStream: fs.WriteStream | undefined
	private logFilePath: string
	private tag: string
	private closed: boolean = false

	constructor({ logDir, filename, tag }: LoggerOptions) {
		this.tag = tag
		this.logFilePath = path.join(logDir, filename)
		this.initializeLogger(logDir)
	}

	private initializeLogger(logDir: string): void {
		try {
			fs.mkdirSync(logDir, { recursive: true })
		} catch (error) {
			console.error(`Failed to create log directory ${logDir}:`, error)
			return
		}

		try {
			this.logStream = fs.createWriteStream(this.logFilePath, { flags: "a" })

			// Handle stream errors
			this.logStream.on("error", (error) => {
				console.error(`Log stream error for ${this.logFilePath}:`, error)
				this.logStream = undefined
			})
		} catch (error) {
			console.error(`Failed to create log file ${this.logFilePath}:`, error)
		}
	}

	private writeToLog(level: LogLevel, message: string, ...args: unknown[]) {
		if (this.closed) {
			console.warn(`Attempted to write to closed logger: ${this.tag}`)
			return
		}

		try {
			const timestamp = new Date().toISOString()

			// Sanitize args to prevent sensitive data leakage
			const sanitizedArgs = args.map((arg) => {
				if (typeof arg === "object" && arg !== null) {
					// Deep clone and redact sensitive keys
					const sanitized = JSON.parse(JSON.stringify(arg))
					this.redactSensitiveData(sanitized)
					return sanitized
				}
				return arg
			})

			const logLine = `[${timestamp} | ${level} | ${this.tag}] ${message} ${
				sanitizedArgs.length > 0 ? JSON.stringify(sanitizedArgs) : ""
			}\n`

			console.log(logLine.trim())

			if (this.logStream && !this.logStream.destroyed) {
				this.logStream.write(logLine)
			}
		} catch (error) {
			console.error(`Failed to write to log file ${this.logFilePath}:`, error)
		}
	}

	/**
	 * Redact sensitive data from log objects
	 */
	private redactSensitiveData(obj: unknown): void {
		const sensitiveKeys = [
			"apiKey",
			"api_key",
			"openRouterApiKey",
			"password",
			"token",
			"secret",
			"auth",
			"authorization",
			"cookie",
		]

		if (typeof obj === "object" && obj !== null) {
			for (const key in obj) {
				const value = (obj as Record<string, unknown>)[key]
				if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
					;(obj as Record<string, unknown>)[key] = "[REDACTED]"
				} else if (typeof value === "object" && value !== null) {
					this.redactSensitiveData(value)
				}
			}
		}
	}

	public info(message: string, ...args: unknown[]): void {
		this.writeToLog(LogLevel.INFO, message, ...args)
	}

	public error(message: string, ...args: unknown[]): void {
		this.writeToLog(LogLevel.ERROR, message, ...args)
	}

	public warn(message: string, ...args: unknown[]): void {
		this.writeToLog(LogLevel.WARN, message, ...args)
	}

	public debug(message: string, ...args: unknown[]): void {
		this.writeToLog(LogLevel.DEBUG, message, ...args)
	}

	public log(message: string, ...args: unknown[]): void {
		this.info(message, ...args)
	}

	public close(): void {
		if (this.closed) {
			return
		}

		this.closed = true

		if (this.logStream && !this.logStream.destroyed) {
			try {
				this.logStream.end()
			} catch (error) {
				console.error(`Failed to close log stream for ${this.logFilePath}:`, error)
			} finally {
				this.logStream = undefined
			}
		}
	}
}
