"use server"

import { revalidatePath } from "next/cache"

import { getTasks as _getTasks } from "@rycode-ext/evals"

export async function getTasks(runId: number) {
	const tasks = await _getTasks(runId)
	revalidatePath(`/runs/${runId}`)
	return tasks
}
