# RyCode Matrix Theme System

> "Where LLMs Collaborate, Not Compete"

Inspired by [toolkit-cli.com](https://toolkit-cli.com), RyCode features a terminal-first, matrix-themed design system that developers will love.

## 🎨 Design Philosophy

The Matrix theme embraces:

- **Terminal-First Aesthetics**: Monospace fonts, ASCII art, and TUI-inspired interfaces
- **Matrix Green Core**: The iconic #00ff00 with complementary LLM-branded accent colors
- **Ambient Motion**: Subtle floating orbs and scanline effects for a living interface
- **High Contrast**: Optimized readability with dark backgrounds and bright text
- **Nostalgic Future**: Combining retro terminal vibes with modern web capabilities

## 🎭 Color Palette

### Core Colors

```css
--matrix-green-primary: #00ff00 /* The iconic matrix green */ --matrix-green-glow: rgba(0, 255, 0, 0.5)
	--matrix-green-dark: #00cc00 --matrix-green-darker: #008800;
```

### LLM Accent Colors

Inspired by toolkit-cli.com's multi-LLM approach:

```css
--claude-blue: #7aa2f7 /* Claude/Anthropic */ --gemini-green: #9ece6a /* Google Gemini */ --codex-magenta: #bb9af7
	/* OpenAI Codex */ --qwen-cyan: #00ffff /* Qwen/Alibaba */;
```

### Dark Theme

```css
--matrix-bg-dark: #0a0e0a --matrix-bg-darker: #050705 --matrix-bg-code: #0d120d --matrix-text-primary: #c0caf5
	--matrix-text-secondary: #9ece6a --matrix-text-muted: #7aa2f7;
```

## 🔧 Components

### ASCII Art Components

#### RyCodeLogo

```tsx
import { RyCodeLogo } from "@/components/common/MatrixAsciiArt"

;<RyCodeLogo />
```

#### TerminalPrompt

```tsx
import { TerminalPrompt } from "@/components/common/MatrixAsciiArt"

;<TerminalPrompt>your-command</TerminalPrompt>
```

#### StatusIcon

```tsx
import { StatusIcon } from "@/components/common/MatrixAsciiArt"

<StatusIcon status="success" /> // ✓
<StatusIcon status="error" />   // ✗
<StatusIcon status="warning" /> // ⚠
<StatusIcon status="info" />    // ℹ
<StatusIcon status="active" />  // ●
```

### Background Effects

#### MatrixBackground

Provides ambient floating orbs and scanline effect:

```tsx
import { MatrixBackground } from "@/components/common/MatrixBackground"

;<MatrixBackground />
```

#### MatrixRainEffect

Optional falling matrix rain animation:

```tsx
import { MatrixRainEffect } from "@/components/common/MatrixBackground"

;<MatrixRainEffect enabled={true} />
```

### Chat Components

#### MatrixMessageContainer

```tsx
import { MatrixMessageContainer } from "@/components/chat/MatrixChatStyles"

;<MatrixMessageContainer type="assistant" timestamp={new Date()}>
	Your message content here
</MatrixMessageContainer>
```

#### MatrixCodeBlock

```tsx
import { MatrixCodeBlock } from "@/components/chat/MatrixChatStyles"

;<MatrixCodeBlock language="typescript" filename="example.ts" code={codeString} />
```

#### MatrixThinking

```tsx
import { MatrixThinking } from "@/components/chat/MatrixChatStyles"

;<MatrixThinking text="Analyzing code..." />
```

## 🎬 Animations

### Cursor Blink

```css
.matrix-cursor {
	animation: matrix-cursor-blink 1s step-end infinite;
}
```

### Glow Pulse

```css
.matrix-animate-glow {
	animation: matrix-glow-pulse 2s ease-in-out infinite;
}
```

### Gradient Shift

```css
.matrix-gradient-text {
	animation: gradient-shift 8s ease infinite;
}
```

### Floating Orbs

```css
.matrix-orb {
	animation: float-orb 20s ease-in-out infinite;
}
```

### Scanline

```css
.matrix-scanline {
	animation: matrix-scan-line 8s linear infinite;
}
```

## 💅 CSS Utility Classes

### Layout

- `.matrix-theme` - Apply matrix background and base styles
- `.matrix-panel` - Card/panel with matrix border and styling
- `.matrix-message` - Chat message container

### Typography

- `.matrix-header` - Title/header text with underline effect
- `.matrix-prompt` - Terminal prompt with $ prefix
- `.matrix-gradient-text` - Animated gradient text
- `.matrix-ascii-art` - Monospace ASCII art container

### Interactive

- `.matrix-button` - Matrix-styled button with hover effects
- `.matrix-input` - Matrix-styled input field
- `.matrix-link` - Matrix-styled link with underline animation

### Status

- `.matrix-status-active` - Green, flickering status
- `.matrix-status-error` - Red error status
- `.matrix-status-warning` - Orange warning status
- `.matrix-status-info` - Blue info status

### Effects

- `.matrix-glow` - Subtle glow shadow
- `.matrix-glow-strong` - Strong glow shadow
- `.matrix-animate-glow` - Pulsing glow animation
- `.matrix-scrollbar` - Matrix-themed scrollbar

## 🎯 Usage Examples

### Full Page Layout

```tsx
<div className="matrix-theme min-h-screen p-6">
	<MatrixBackground />
	<div className="relative z-10">
		<RyCodeLogo />
		<MatrixQuote />
		{/* Your content */}
	</div>
</div>
```

### Chat Interface

```tsx
<div className="matrix-theme">
	<MatrixBackground />
	<div className="space-y-4">
		<MatrixMessageContainer type="user" timestamp={new Date()}>
			<p>Help me refactor this code</p>
		</MatrixMessageContainer>

		<MatrixThinking text="Analyzing code structure..." />

		<MatrixMessageContainer type="assistant" timestamp={new Date()}>
			<p>I'll help you refactor this. Here's my approach:</p>
			<MatrixCodeBlock language="typescript" filename="refactored.ts" code={refactoredCode} />
			<MatrixTokenCounter tokens={1250} cost={0.025} model="claude-opus-4" />
		</MatrixMessageContainer>
	</div>
</div>
```

### Loading State

```tsx
<div className="matrix-panel">
	<MatrixProgressBar progress={75} label="Processing files..." />
	<div className="mt-4">
		<MatrixToolIndicator tool="read-file" status="success" />
		<MatrixToolIndicator tool="edit-file" status="running" />
		<MatrixToolIndicator tool="write-file" status="running" />
	</div>
</div>
```

## 🎨 Customization

### Adjusting Glow Intensity

```css
/* In your component styles */
.my-component {
	--matrix-glow-shadow: 0 0 15px rgba(0, 255, 0, 0.4);
}
```

### Changing Animation Speed

```css
/* Faster scanline */
.matrix-scanline {
	animation-duration: 4s;
}

/* Slower orbs */
.matrix-orb {
	animation-duration: 30s;
}
```

### Custom Accent Colors

```css
/* Add your own LLM colors */
:root {
	--my-llm-color: #ff00ff;
}

.my-llm-message {
	border-left-color: var(--my-llm-color);
}
```

## 🚀 Performance Tips

1. **Disable effects on low-end devices**: Use `MatrixThemeToggle` to let users control effects
2. **Limit rain effect**: Set `enabled={false}` on `MatrixRainEffect` for better performance
3. **Reduce orb count**: Remove orbs from `MatrixBackground` if needed
4. **Use CSS containment**: Add `contain: layout style paint;` to isolated components

## 📱 Responsive Behavior

The matrix theme is fully responsive:

- Mobile: Simplified effects, reduced glow
- Tablet: Full effects with optimized performance
- Desktop: All effects enabled

## ♿ Accessibility

- All decorative elements have `aria-hidden="true"`
- Status icons include `aria-label` attributes
- High contrast ensures WCAG AAA compliance
- Animations respect `prefers-reduced-motion`

## 🎓 Inspiration

This theme system was inspired by:

- [toolkit-cli.com](https://toolkit-cli.com) - The beautiful TUI aesthetic
- Classic terminal interfaces - Green on black nostalgia
- The Matrix (1999) - Iconic digital rain aesthetic
- Modern developer tools - VSCode, terminal emulators

## 📄 License

Part of RyCode-Ext, same license applies.

---

Built with 💚 for developers who love terminals
