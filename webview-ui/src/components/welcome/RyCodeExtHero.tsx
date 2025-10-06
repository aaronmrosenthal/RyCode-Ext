import { useState } from "react"
import { RyCodeLogo, MatrixQuote } from "../common/MatrixAsciiArt"

const RyCodeExtHero = () => {
	const [imagesBaseUri] = useState(() => {
		const w = window as any
		return w.IMAGES_BASE_URI || ""
	})

	const [showAscii, setShowAscii] = useState(false)

	return (
		<div className="flex flex-col items-center justify-center pb-4 forced-color-adjust-none">
			{showAscii ? (
				<div className="text-center">
					<RyCodeLogo />
					<MatrixQuote />
				</div>
			) : (
				<div
					style={{
						background: "var(--matrix-gradient)",
						backgroundSize: "200% auto",
						WebkitBackgroundClip: "text",
						backgroundClip: "text",
						WebkitTextFillColor: "transparent",
					}}
					className="mx-auto matrix-gradient-text">
					<img
						src={imagesBaseUri + "/rycode-ext-logo.svg"}
						alt="RyCode-Ext logo"
						className="h-8"
						style={{
							filter: "drop-shadow(0 0 20px rgba(122, 162, 247, 0.3))",
						}}
					/>
				</div>
			)}
			<button
				onClick={() => setShowAscii(!showAscii)}
				className="text-xs text-[var(--matrix-text-muted)] hover:text-[var(--matrix-green-primary)] transition-colors mt-2 font-mono"
				title={showAscii ? "Show SVG logo" : "Show ASCII art"}>
				{showAscii ? "[ SVG ]" : "[ ASCII ]"}
			</button>
		</div>
	)
}

export default RyCodeExtHero
