import React from "react"
import { StatusIcon } from "../common/MatrixAsciiArt"

/**
 * Matrix-themed chat message wrapper
 */
export const MatrixMessageContainer = ({
	type,
	children,
	timestamp,
}: {
	type: "user" | "assistant" | "system"
	children: React.ReactNode
	timestamp?: Date
}) => {
	const borderColors = {
		user: "var(--claude-blue)",
		assistant: "var(--matrix-green-primary)",
		system: "var(--qwen-cyan)",
	}

	const icons = {
		user: "👤",
		assistant: "🤖",
		system: "⚙️",
	}

	return (
		<div className="matrix-message" style={{ borderLeftColor: borderColors[type] }}>
			<div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--matrix-border)]">
				<span className="text-lg">{icons[type]}</span>
				<span className="matrix-badge text-xs">{type.toUpperCase()}</span>
				{timestamp && (
					<span className="text-xs text-[var(--matrix-text-muted)] ml-auto font-mono">
						{timestamp.toLocaleTimeString()}
					</span>
				)}
			</div>
			<div className="matrix-message-content">{children}</div>
		</div>
	)
}

/**
 * Matrix-themed thinking/processing indicator
 */
export const MatrixThinking = ({ text = "Processing..." }: { text?: string }) => {
	return (
		<div className="flex items-center gap-2 p-3 rounded matrix-panel">
			<div className="matrix-spinner"></div>
			<span className="matrix-prompt">{text}</span>
		</div>
	)
}

/**
 * Matrix-themed tool usage indicator
 */
export const MatrixToolIndicator = ({ tool, status }: { tool: string; status: "running" | "success" | "error" }) => {
	return (
		<div className="flex items-center gap-2 p-2 mb-2 rounded bg-[var(--matrix-bg-code)] border border-[var(--matrix-border)]">
			<StatusIcon status={status === "running" ? "active" : status} />
			<span className="font-mono text-sm text-[var(--matrix-text-secondary)]">{tool}</span>
			{status === "running" && <div className="matrix-spinner ml-auto"></div>}
		</div>
	)
}

/**
 * Matrix-themed code block wrapper
 */
export const MatrixCodeBlock = ({
	language,
	code,
	filename,
}: {
	language?: string
	code: string
	filename?: string
}) => {
	return (
		<div className="matrix-code-block">
			{(filename || language) && (
				<div className="flex items-center justify-between mb-2 pb-2 border-b border-[var(--matrix-border)]">
					{filename && <span className="matrix-badge text-xs">{filename}</span>}
					{language && (
						<span className="text-xs text-[var(--matrix-text-muted)] font-mono ml-auto">{language}</span>
					)}
				</div>
			)}
			<pre className="font-mono text-sm text-[var(--matrix-text-primary)] overflow-x-auto matrix-scrollbar">
				<code>{code}</code>
			</pre>
		</div>
	)
}

/**
 * Matrix-themed token/cost counter
 */
export const MatrixTokenCounter = ({ tokens, cost, model }: { tokens?: number; cost?: number; model?: string }) => {
	return (
		<div className="flex items-center gap-3 text-xs font-mono text-[var(--matrix-text-muted)]">
			{model && <span className="matrix-badge">{model}</span>}
			{tokens !== undefined && (
				<span className="flex items-center gap-1">
					<span className="text-[var(--gemini-green)]">▣</span>
					{tokens.toLocaleString()} tokens
				</span>
			)}
			{cost !== undefined && (
				<span className="flex items-center gap-1">
					<span className="text-[var(--qwen-cyan)]">$</span>${cost.toFixed(4)}
				</span>
			)}
		</div>
	)
}

/**
 * Matrix-themed file tree display
 */
export const MatrixFileTree = ({ files }: { files: string[] }) => {
	return (
		<div className="matrix-panel p-3">
			<div className="matrix-header text-xs mb-2">Modified Files</div>
			<div className="font-mono text-sm space-y-1">
				{files.map((file, i) => (
					<div key={i} className="flex items-center gap-2">
						<span className="text-[var(--matrix-border)]">{i === files.length - 1 ? "└─" : "├─"}</span>
						<span className="text-[var(--gemini-green)]">📄</span>
						<span className="text-[var(--claude-blue)]">{file}</span>
					</div>
				))}
			</div>
		</div>
	)
}

/**
 * Matrix-themed approval buttons
 */
export const MatrixApprovalButtons = ({
	onApprove,
	onReject,
	disabled = false,
}: {
	onApprove: () => void
	onReject: () => void
	disabled?: boolean
}) => {
	return (
		<div className="flex gap-2 mt-3">
			<button
				onClick={onApprove}
				disabled={disabled}
				className="matrix-button flex-1 !border-[var(--matrix-green-primary)] hover:!bg-[var(--matrix-green-primary)] hover:!text-[var(--matrix-bg-dark)]">
				<span className="flex items-center justify-center gap-2">
					<span>✓</span>
					<span>APPROVE</span>
				</span>
			</button>
			<button
				onClick={onReject}
				disabled={disabled}
				className="matrix-button flex-1 !border-[#ff6b6b] hover:!bg-[#ff6b6b] hover:!text-white">
				<span className="flex items-center justify-center gap-2">
					<span>✗</span>
					<span>REJECT</span>
				</span>
			</button>
		</div>
	)
}

/**
 * Matrix-themed progress bar
 */
export const MatrixProgressBar = ({ progress, label }: { progress: number; label?: string }) => {
	return (
		<div className="space-y-1">
			{label && (
				<div className="flex items-center justify-between text-xs font-mono">
					<span className="text-[var(--matrix-text-secondary)]">{label}</span>
					<span className="text-[var(--matrix-green-primary)]">{Math.round(progress)}%</span>
				</div>
			)}
			<div className="h-2 bg-[var(--matrix-bg-code)] border border-[var(--matrix-border)] rounded overflow-hidden">
				<div
					className="h-full bg-[var(--matrix-green-primary)] transition-all duration-300 matrix-animate-glow"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	)
}

/**
 * Matrix-themed notification badge
 */
export const MatrixNotificationBadge = ({ count, pulse = false }: { count: number; pulse?: boolean }) => {
	if (count === 0) return null

	return (
		<span
			className={`
				inline-flex items-center justify-center
				min-w-[20px] h-5 px-1.5
				text-xs font-bold font-mono
				bg-[var(--matrix-green-primary)]
				text-[var(--matrix-bg-dark)]
				rounded-full
				${pulse ? "matrix-animate-glow" : ""}
			`}>
			{count > 99 ? "99+" : count}
		</span>
	)
}
