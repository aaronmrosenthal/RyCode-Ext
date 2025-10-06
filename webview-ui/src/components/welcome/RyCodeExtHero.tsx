import { useState } from "react"

const RyCodeExtHero = () => {
	const [imagesBaseUri] = useState(() => {
		const w = window as any
		return w.IMAGES_BASE_URI || ""
	})

	return (
		<div className="flex flex-col items-center justify-center pb-4 forced-color-adjust-none">
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
		</div>
	)
}

export default RyCodeExtHero
