# Matrix Theme Integration Guide

Quick guide to integrating the Matrix theme into RyCode components.

## ⚡ Quick Start

### 1. Import the theme in your component

```tsx
import { MatrixBackground } from "@/components/common/MatrixBackground"
import { RyCodeLogo, TerminalPrompt } from "@/components/common/MatrixAsciiArt"
```

### 2. Wrap your layout with matrix-theme class

```tsx
<div className="matrix-theme min-h-screen">
	<MatrixBackground />
	<div className="relative z-10">{/* Your content */}</div>
</div>
```

## 🎯 Integration Points

### App.tsx

Add the matrix background to the root:

```tsx
// In App.tsx
import { MatrixBackground } from "@/components/common/MatrixBackground"

export default function App() {
	return (
		<div className="matrix-theme h-screen overflow-hidden">
			<MatrixBackground />
			<TooltipProvider delayDuration={STANDARD_TOOLTIP_DELAY}>
				<div className="relative z-10 h-full">{/* Existing app content */}</div>
			</TooltipProvider>
		</div>
	)
}
```

### ChatView.tsx

Update the chat view with matrix styling:

```tsx
// Add to ChatView.tsx
import {
	MatrixMessageContainer,
	MatrixThinking,
	MatrixCodeBlock,
	MatrixTokenCounter,
} from "@/components/chat/MatrixChatStyles"
import { TerminalPrompt } from "@/components/common/MatrixAsciiArt"

// In render:
;<div className="matrix-scrollbar h-full overflow-y-auto">
	{messages.map((msg, i) => (
		<MatrixMessageContainer key={i} type={msg.type} timestamp={msg.ts}>
			{msg.text}
		</MatrixMessageContainer>
	))}
</div>
```

### ChatTextArea.tsx

Add matrix styling to the input:

```tsx
<textarea className="matrix-input w-full resize-none" placeholder="Type your message... (or use /help for commands)" />
```

### Welcome Screen

Update welcome view with ASCII art:

```tsx
// In WelcomeView.tsx
import { WelcomeBanner } from "@/components/common/MatrixAsciiArt"

;<div className="matrix-theme p-8">
	<MatrixBackground />
	<div className="relative z-10">
		<WelcomeBanner />
		{/* Rest of welcome content */}
	</div>
</div>
```

## 🎨 Styling Tips

### VS Code Theme Integration

The matrix theme respects VS Code's theme while adding matrix enhancements:

```tsx
// Use CSS variables that fallback to VSCode theme
<div style={{
  background: 'var(--matrix-bg-dark)',
  // Fallback to VSCode if matrix theme disabled
  color: 'var(--vscode-editor-foreground)'
}}>
```

### Conditional Matrix Theme

Allow users to toggle the matrix theme:

```tsx
import { useState } from "react"
import { MatrixThemeToggle } from "@/components/common/MatrixBackground"

function YourComponent() {
	const [matrixEnabled, setMatrixEnabled] = useState(true)

	return (
		<div className={matrixEnabled ? "matrix-theme" : ""}>
			<MatrixThemeToggle enabled={matrixEnabled} onChange={setMatrixEnabled} />
			{matrixEnabled && <MatrixBackground />}
			{/* Your content */}
		</div>
	)
}
```

## 📋 Component Migration Checklist

- [ ] Wrap root component with `matrix-theme` class
- [ ] Add `<MatrixBackground />` to layout
- [ ] Replace standard buttons with `matrix-button` class
- [ ] Update input fields with `matrix-input` class
- [ ] Use `MatrixMessageContainer` for chat messages
- [ ] Replace loading spinners with `MatrixThinking`
- [ ] Add `MatrixCodeBlock` for code displays
- [ ] Use `TerminalPrompt` for command inputs
- [ ] Add ASCII art (`RyCodeLogo`, `MatrixQuote`) to welcome/empty states
- [ ] Apply `matrix-scrollbar` to scrollable containers

## 🎬 Animation Guidelines

### When to use animations

- **Always**: Subtle glow effects, cursor blink
- **User interaction**: Button hover effects, link underlines
- **Status changes**: Progress bars, loading states
- **Optional**: Floating orbs, scanline, matrix rain

### Performance considerations

```tsx
// Disable heavy effects on low-end devices
const shouldUseHeavyEffects = window.matchMedia('(prefers-reduced-motion: no-preference)').matches
  && navigator.hardwareConcurrency > 4

<MatrixRainEffect enabled={shouldUseHeavyEffects} />
```

## 🔧 Customization Examples

### Custom Message Types

```tsx
// Add custom border colors for different message types
<div
	className="matrix-message"
	style={{
		borderLeftColor: "var(--codex-magenta)",
	}}>
	<span className="matrix-badge">SYSTEM</span>
	<p>System message content</p>
</div>
```

### Custom Status Indicators

```tsx
import { StatusIcon } from "@/components/common/MatrixAsciiArt"

;<div className="flex items-center gap-2">
	<StatusIcon status="success" />
	<span>Build completed</span>
	<MatrixTokenCounter tokens={1500} cost={0.03} />
</div>
```

### Custom Panels

```tsx
<div className="matrix-panel">
	<div className="matrix-header text-sm mb-3">API Configuration</div>
	<div className="space-y-3">
		<input className="matrix-input w-full" placeholder="API Key" />
		<button className="matrix-button w-full">SAVE</button>
	</div>
</div>
```

## 🐛 Troubleshooting

### Styles not applying

1. Check that `matrix-theme.css` is imported in `index.css`
2. Verify the component has the `matrix-theme` class on a parent
3. Clear your browser cache
4. Check CSS specificity (matrix classes may need `!important`)

### Animations not working

1. Check browser support for CSS animations
2. Verify `@keyframes` are defined in `matrix-theme.css`
3. Check for `prefers-reduced-motion` media query
4. Inspect element to see if animation is applied

### Performance issues

1. Disable `MatrixRainEffect` if lag occurs
2. Reduce number of floating orbs (edit `MatrixBackground.tsx`)
3. Decrease animation duration for smoother performance
4. Use `will-change: transform` sparingly

## 📱 Mobile Optimization

```tsx
// Conditionally render heavy effects
const isMobile = window.matchMedia('(max-width: 768px)').matches

<div className="matrix-theme">
  {!isMobile && <MatrixBackground />}
  {/* Simplified UI on mobile */}
</div>
```

## 🎓 Best Practices

1. **Accessibility First**: Always include ARIA labels and respect reduced motion
2. **Progressive Enhancement**: Theme should work without JavaScript
3. **Performance**: Monitor frame rate, disable heavy effects if < 30fps
4. **Consistency**: Use theme components/classes throughout
5. **User Control**: Provide toggle for matrix effects
6. **Fallbacks**: Always fall back to VS Code theme colors

## 📚 Next Steps

1. Test the theme in different VS Code themes
2. Gather user feedback on accessibility
3. Optimize performance on various devices
4. Create theme variants (e.g., "matrix-lite")
5. Add theme persistence to user settings

---

For detailed component documentation, see [MATRIX_THEME.md](./MATRIX_THEME.md)
