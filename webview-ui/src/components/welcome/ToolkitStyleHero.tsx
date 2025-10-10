import { TerminalWindow, TerminalPrompt, TerminalLine } from "../common/TerminalWindow"

const ToolkitStyleHero = () => {
	return (
		<div className="toolkit-hero">
			<TerminalWindow title="~/rycode-ext">
				<TerminalPrompt command="rycode-ext" args='--ai "claude gemini qwen codex"' />

				<div className="space-y-3 mb-6">
					<TerminalLine color="claude" icon="●">
						Claude analyzing architecture patterns...
					</TerminalLine>
					<TerminalLine color="gemini" icon="●">
						Gemini reviewing UX implications...
					</TerminalLine>
					<TerminalLine color="qwen" icon="●">
						Qwen checking i18n compliance...
					</TerminalLine>
					<TerminalLine color="codex" icon="●">
						Codex generating optimized solution...
					</TerminalLine>
				</div>

				<TerminalLine color="green" icon="✓">
					Synthesized fix applied. 4 agents collaborated.
				</TerminalLine>
			</TerminalWindow>

			<div className="text-center mt-8 mb-4">
				<h1
					className="text-2xl font-bold matrix-gradient-text mb-2"
					style={{ fontFamily: "var(--font-display)" }}>
					Where LLMs Collaborate, Not Compete
				</h1>
				<p className="text-[var(--matrix-text-secondary)] text-sm font-mono">
					Multi-agent AI development powered by toolkit-cli
				</p>
			</div>
		</div>
	)
}

export default ToolkitStyleHero
