import React from "react"

interface TerminalWindowProps {
	children: React.ReactNode
	title?: string
	className?: string
}

export const TerminalWindow = ({ children, title = "~toolkit-cli", className = "" }: TerminalWindowProps) => {
	return (
		<div className={`terminal-window ${className}`}>
			<div className="terminal-chrome">
				<div className="terminal-buttons">
					<span className="terminal-button terminal-button-red" aria-hidden="true"></span>
					<span className="terminal-button terminal-button-yellow" aria-hidden="true"></span>
					<span className="terminal-button terminal-button-green" aria-hidden="true"></span>
				</div>
				<div className="terminal-title">{title}</div>
			</div>
			<div className="terminal-content">{children}</div>
		</div>
	)
}

interface TerminalLineProps {
	children: React.ReactNode
	color?: "claude" | "gemini" | "qwen" | "codex" | "green" | "white"
	icon?: string
}

export const TerminalLine = ({ children, color = "white", icon }: TerminalLineProps) => {
	const colorClasses = {
		claude: "text-[var(--claude-blue)]",
		gemini: "text-[var(--gemini-green)]",
		qwen: "text-[var(--qwen-cyan)]",
		codex: "text-[var(--codex-magenta)]",
		green: "text-[var(--matrix-green-primary)]",
		white: "text-[var(--matrix-text-primary)]",
	}

	return (
		<div className="flex items-start gap-2 font-mono text-sm leading-relaxed">
			{icon && <span className={colorClasses[color]}>{icon}</span>}
			<span className={colorClasses[color]}>{children}</span>
		</div>
	)
}

interface TerminalPromptProps {
	command?: string
	args?: string
}

export const TerminalPrompt = ({ command = "toolkit-cli", args }: TerminalPromptProps) => {
	return (
		<div className="flex items-center gap-2 font-mono text-sm mb-4">
			<span className="text-[var(--matrix-text-muted)]">$</span>
			<span className="text-[var(--matrix-text-primary)]">{command}</span>
			{args && <span className="text-[var(--claude-blue)]">{args}</span>}
			<span className="matrix-cursor" aria-hidden="true"></span>
		</div>
	)
}

export const TerminalSuccess = ({ children }: { children: React.ReactNode }) => {
	return (
		<div className="flex items-start gap-2 font-mono text-sm text-[var(--matrix-green-primary)]">
			<span>✓</span>
			<span>{children}</span>
		</div>
	)
}
