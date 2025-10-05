import type { TaskMetrics, Run } from "@rycode-ext/evals"

export type EvalRun = Run & {
	label: string
	score: number
	languageScores?: Record<"go" | "java" | "javascript" | "python" | "rust", number>
	taskMetrics: TaskMetrics
	modelId?: string
}
