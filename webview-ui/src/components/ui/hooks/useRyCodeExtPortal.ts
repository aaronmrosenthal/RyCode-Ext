import { useState } from "react"
import { useMount } from "react-use"

export const useRyCodeExtPortal = (id: string) => {
	const [container, setContainer] = useState<HTMLElement>()

	useMount(() => setContainer(document.getElementById(id) ?? undefined))

	return container
}
