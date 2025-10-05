import React, { useEffect, useRef } from "react"

/**
 * Matrix Background Component
 * Provides the ambient orbs and scanline effect inspired by toolkit-cli.com
 */
export const MatrixBackground = () => {
	return (
		<>
			{/* Floating orbs */}
			<div className="matrix-orbs">
				<div className="matrix-orb"></div>
				<div className="matrix-orb"></div>
				<div className="matrix-orb"></div>
			</div>
			{/* Scanline effect */}
			<div className="matrix-scanline"></div>
		</>
	)
}

/**
 * Matrix Rain Effect
 * Optional falling text effect for enhanced terminal aesthetic
 */
export const MatrixRainEffect = ({ enabled = true }: { enabled?: boolean }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		if (!enabled || !canvasRef.current) return

		const canvas = canvasRef.current
		const ctx = canvas.getContext("2d")
		if (!ctx) return

		// Set canvas size
		const resizeCanvas = () => {
			canvas.width = window.innerWidth
			canvas.height = window.innerHeight
		}
		resizeCanvas()
		window.addEventListener("resize", resizeCanvas)

		// Matrix characters
		const chars = "01アイウエオカキクケコサシスセソABCDEFGHIJKLMNOPQRSTUVWXYZ"
		const fontSize = 14
		const columns = canvas.width / fontSize

		// Initialize drops
		const drops: number[] = []
		for (let i = 0; i < columns; i++) {
			drops[i] = Math.random() * -100
		}

		// Drawing function
		const draw = () => {
			// Fade effect
			ctx.fillStyle = "rgba(10, 14, 10, 0.05)"
			ctx.fillRect(0, 0, canvas.width, canvas.height)

			ctx.fillStyle = "#00ff00"
			ctx.font = `${fontSize}px monospace`

			for (let i = 0; i < drops.length; i++) {
				const text = chars[Math.floor(Math.random() * chars.length)]
				const x = i * fontSize
				const y = drops[i] * fontSize

				ctx.fillText(text, x, y)

				if (y > canvas.height && Math.random() > 0.975) {
					drops[i] = 0
				}
				drops[i]++
			}
		}

		const interval = setInterval(draw, 33)

		return () => {
			clearInterval(interval)
			window.removeEventListener("resize", resizeCanvas)
		}
	}, [enabled])

	if (!enabled) return null

	return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-10 z-0" aria-hidden="true" />
}

/**
 * Matrix Theme Toggle Button
 * Allows users to enable/disable matrix effects
 */
export const MatrixThemeToggle = ({
	enabled,
	onChange,
}: {
	enabled: boolean
	onChange: (enabled: boolean) => void
}) => {
	return (
		<button
			onClick={() => onChange(!enabled)}
			className="matrix-button text-xs"
			title={enabled ? "Disable Matrix Theme" : "Enable Matrix Theme"}>
			<span className="flex items-center gap-2">
				<span>{enabled ? "●" : "○"}</span>
				<span>MATRIX MODE</span>
			</span>
		</button>
	)
}
