import { z } from "zod"

import { clineMessageSchema, tokenUsageSchema } from "./message.js"
import { toolNamesSchema, toolUsageSchema } from "./tool.js"

/**
 * RyCodeExtEventName
 */

export enum RyCodeExtEventName {
	// Task Provider Lifecycle
	TaskCreated = "taskCreated",

	// Task Lifecycle
	TaskStarted = "taskStarted",
	TaskCompleted = "taskCompleted",
	TaskAborted = "taskAborted",
	TaskFocused = "taskFocused",
	TaskUnfocused = "taskUnfocused",
	TaskActive = "taskActive",
	TaskInteractive = "taskInteractive",
	TaskResumable = "taskResumable",
	TaskIdle = "taskIdle",

	// Subtask Lifecycle
	TaskPaused = "taskPaused",
	TaskUnpaused = "taskUnpaused",
	TaskSpawned = "taskSpawned",

	// Task Execution
	Message = "message",
	TaskModeSwitched = "taskModeSwitched",
	TaskAskResponded = "taskAskResponded",
	TaskUserMessage = "taskUserMessage",

	// Task Analytics
	TaskTokenUsageUpdated = "taskTokenUsageUpdated",
	TaskToolFailed = "taskToolFailed",

	// Configuration Changes
	ModeChanged = "modeChanged",
	ProviderProfileChanged = "providerProfileChanged",

	// Evals
	EvalPass = "evalPass",
	EvalFail = "evalFail",
}

/**
 * RyCodeExtEvents
 */

export const rooCodeEventsSchema = z.object({
	[RyCodeExtEventName.TaskCreated]: z.tuple([z.string()]),

	[RyCodeExtEventName.TaskStarted]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskCompleted]: z.tuple([
		z.string(),
		tokenUsageSchema,
		toolUsageSchema,
		z.object({
			isSubtask: z.boolean(),
		}),
	]),
	[RyCodeExtEventName.TaskAborted]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskFocused]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskUnfocused]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskActive]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskInteractive]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskResumable]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskIdle]: z.tuple([z.string()]),

	[RyCodeExtEventName.TaskPaused]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskUnpaused]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskSpawned]: z.tuple([z.string(), z.string()]),

	[RyCodeExtEventName.Message]: z.tuple([
		z.object({
			taskId: z.string(),
			action: z.union([z.literal("created"), z.literal("updated")]),
			message: clineMessageSchema,
		}),
	]),
	[RyCodeExtEventName.TaskModeSwitched]: z.tuple([z.string(), z.string()]),
	[RyCodeExtEventName.TaskAskResponded]: z.tuple([z.string()]),
	[RyCodeExtEventName.TaskUserMessage]: z.tuple([z.string()]),

	[RyCodeExtEventName.TaskToolFailed]: z.tuple([z.string(), toolNamesSchema, z.string()]),
	[RyCodeExtEventName.TaskTokenUsageUpdated]: z.tuple([z.string(), tokenUsageSchema]),

	[RyCodeExtEventName.ModeChanged]: z.tuple([z.string()]),
	[RyCodeExtEventName.ProviderProfileChanged]: z.tuple([z.object({ name: z.string(), provider: z.string() })]),
})

export type RyCodeExtEvents = z.infer<typeof rooCodeEventsSchema>

/**
 * TaskEvent
 */

export const taskEventSchema = z.discriminatedUnion("eventName", [
	// Task Provider Lifecycle
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskCreated),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskCreated],
		taskId: z.number().optional(),
	}),

	// Task Lifecycle
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskStarted),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskStarted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskCompleted),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskCompleted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskAborted),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskAborted],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskFocused),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskFocused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskUnfocused),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskUnfocused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskActive),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskActive],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskInteractive),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskInteractive],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskResumable),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskResumable],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskIdle),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskIdle],
		taskId: z.number().optional(),
	}),

	// Subtask Lifecycle
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskPaused),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskPaused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskUnpaused),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskUnpaused],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskSpawned),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskSpawned],
		taskId: z.number().optional(),
	}),

	// Task Execution
	z.object({
		eventName: z.literal(RyCodeExtEventName.Message),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.Message],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskModeSwitched),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskModeSwitched],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskAskResponded),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskAskResponded],
		taskId: z.number().optional(),
	}),

	// Task Analytics
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskToolFailed),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskToolFailed],
		taskId: z.number().optional(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.TaskTokenUsageUpdated),
		payload: rooCodeEventsSchema.shape[RyCodeExtEventName.TaskTokenUsageUpdated],
		taskId: z.number().optional(),
	}),

	// Evals
	z.object({
		eventName: z.literal(RyCodeExtEventName.EvalPass),
		payload: z.undefined(),
		taskId: z.number(),
	}),
	z.object({
		eventName: z.literal(RyCodeExtEventName.EvalFail),
		payload: z.undefined(),
		taskId: z.number(),
	}),
])

export type TaskEvent = z.infer<typeof taskEventSchema>
