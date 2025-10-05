import React from "react"

export const RyCodeLogo = () => (
	<div className="matrix-ascii-art" aria-label="RyCode Logo">
		{`
 ██████╗ ██╗   ██╗ ██████╗ ██████╗ ██████╗ ███████╗
 ██╔══██╗╚██╗ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
 ██████╔╝ ╚████╔╝ ██║     ██║   ██║██║  ██║█████╗
 ██╔══██╗  ╚██╔╝  ██║     ██║   ██║██║  ██║██╔══╝
 ██║  ██║   ██║   ╚██████╗╚██████╔╝██████╔╝███████╗
 ╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝
`}
	</div>
)

export const MatrixRain = () => (
	<div className="matrix-ascii-art text-xs opacity-30" aria-hidden="true">
		{`
01001100 01001100 01001101 01110011
01000011 01101111 01101100 01101100
01100001 01100010 01101111 01110010
01100001 01110100 01100101
`}
	</div>
)

export const TerminalPrompt = ({ children }: { children?: React.ReactNode }) => (
	<div className="flex items-center gap-2 font-mono text-sm">
		<span className="text-[var(--gemini-green)]">$</span>
		<span className="text-[var(--matrix-green-primary)]">{children || "rycode"}</span>
		<span className="matrix-cursor" aria-hidden="true"></span>
	</div>
)

export const AsciiDivider = ({ variant = "default" }: { variant?: "default" | "thick" | "double" }) => {
	const dividers = {
		default: "─".repeat(60),
		thick: "━".repeat(60),
		double: "═".repeat(60),
	}

	return (
		<div className="matrix-ascii-art text-[var(--matrix-border)]" aria-hidden="true">
			{dividers[variant]}
		</div>
	)
}

export const LoadingSpinner = () => (
	<div className="matrix-ascii-art inline-block" aria-label="Loading">
		<span className="matrix-status-active">⣾⣽⣻⢿⡿⣟⣯⣷</span>
	</div>
)

export const StatusIcon = ({ status }: { status: "success" | "error" | "warning" | "info" | "active" }) => {
	const icons = {
		success: { char: "✓", class: "matrix-status-active" },
		error: { char: "✗", class: "matrix-status-error" },
		warning: { char: "⚠", class: "matrix-status-warning" },
		info: { char: "ℹ", class: "matrix-status-info" },
		active: { char: "●", class: "matrix-status-active" },
	}

	const icon = icons[status]

	return (
		<span className={`matrix-ascii-art ${icon.class}`} aria-label={status}>
			{icon.char}
		</span>
	)
}

export const BoxBorder = ({ children, title }: { children: React.ReactNode; title?: string }) => (
	<div className="matrix-panel font-mono text-sm">
		{title && (
			<div className="flex items-center gap-2 mb-3 pb-2 border-b border-[var(--matrix-border)]">
				<span className="text-[var(--matrix-green-primary)]">┌─</span>
				<span className="matrix-header text-xs">{title}</span>
				<span className="text-[var(--matrix-green-primary)]">─┐</span>
			</div>
		)}
		<div className="pl-2">{children}</div>
	</div>
)

export const TreeView = ({ items }: { items: Array<{ label: string; children?: Array<{ label: string }> }> }) => (
	<div className="font-mono text-sm text-[var(--matrix-text-primary)]">
		{items.map((item, i) => (
			<div key={i}>
				<div className="flex items-center gap-1">
					<span className="text-[var(--matrix-border)]">{i === items.length - 1 ? "└─" : "├─"}</span>
					<span className="text-[var(--gemini-green)]">{item.label}</span>
				</div>
				{item.children &&
					item.children.map((child, j) => (
						<div key={j} className="flex items-center gap-1 ml-4">
							<span className="text-[var(--matrix-border)]">
								{i === items.length - 1 ? "  " : "│ "}
								{j === item.children!.length - 1 ? "└─" : "├─"}
							</span>
							<span className="text-[var(--claude-blue)]">{child.label}</span>
						</div>
					))}
			</div>
		))}
	</div>
)

export const MatrixQuote = () => (
	<div className="matrix-ascii-art text-center py-4 text-[var(--matrix-text-muted)]">
		{`
╔═══════════════════════════════════════════════╗
║  "Where LLMs Collaborate, Not Compete"       ║
╚═══════════════════════════════════════════════╝
`}
	</div>
)

export const WelcomeBanner = () => (
	<div className="matrix-panel p-6 my-4">
		<RyCodeLogo />
		<MatrixQuote />
		<div className="mt-4 text-center">
			<p className="matrix-gradient-text text-lg font-bold mb-2">Terminal-First AI Development Environment</p>
			<TerminalPrompt>
				Type your command or press <kbd className="matrix-badge">Enter</kbd> to begin
			</TerminalPrompt>
		</div>
	</div>
)
