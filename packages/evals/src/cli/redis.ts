import { createClient, type RedisClientType } from "redis"

let redis: RedisClientType | undefined
let isConnecting = false

export const redisClient = async () => {
	if (!redis) {
		// Prevent multiple simultaneous connection attempts
		while (isConnecting) {
			await new Promise((resolve) => setTimeout(resolve, 100))
		}

		if (!redis) {
			isConnecting = true
			try {
				redis = createClient({
					url: process.env.REDIS_URL || "redis://localhost:6379",
					socket: {
						reconnectStrategy: (retries) => {
							if (retries > 10) {
								console.error("redis: max reconnection attempts reached")
								return new Error("Max reconnection attempts reached")
							}
							// Exponential backoff: 100ms, 200ms, 400ms, ...
							return Math.min(100 * Math.pow(2, retries), 3000)
						},
					},
				})

				redis.on("error", (error) => console.error("redis error:", error))
				redis.on("reconnecting", () => console.log("redis: reconnecting..."))
				redis.on("ready", () => console.log("redis: connection ready"))

				await redis.connect()
			} finally {
				isConnecting = false
			}
		}
	}

	return redis
}

/**
 * Gracefully close Redis connection
 * Should be called on process shutdown
 */
export const closeRedisConnection = async () => {
	if (redis) {
		try {
			await redis.quit()
			redis = undefined
		} catch (error) {
			console.error("redis: failed to close connection gracefully:", error)
			try {
				await redis?.disconnect()
				redis = undefined
			} catch (disconnectError) {
				console.error("redis: failed to disconnect:", disconnectError)
			}
		}
	}
}

export const getPubSubKey = (runId: number) => `evals:${runId}`
export const getRunnersKey = (runId: number) => `runners:${runId}`
export const getHeartbeatKey = (runId: number) => `heartbeat:${runId}`

export const registerRunner = async ({
	runId,
	taskId,
	timeoutSeconds,
}: {
	runId: number
	taskId: number
	timeoutSeconds: number
}) => {
	const redis = await redisClient()
	const runnersKey = getRunnersKey(runId)
	await redis.sAdd(runnersKey, `task-${taskId}:${process.env.HOSTNAME ?? process.pid}`)
	await redis.expire(runnersKey, timeoutSeconds)
}

export const deregisterRunner = async ({ runId, taskId }: { runId: number; taskId: number }) => {
	const redis = await redisClient()
	await redis.sRem(getRunnersKey(runId), `task-${taskId}:${process.env.HOSTNAME ?? process.pid}`)
}

export const startHeartbeat = async (runId: number, seconds: number = 10) => {
	const pid = process.pid.toString()
	const redis = await redisClient()
	const heartbeatKey = getHeartbeatKey(runId)
	await redis.setEx(heartbeatKey, seconds, pid)

	return setInterval(
		() =>
			redis.expire(heartbeatKey, seconds).catch((error) => {
				console.error("heartbeat error:", error)
			}),
		(seconds * 1_000) / 2,
	)
}

export const stopHeartbeat = async (runId: number, heartbeat: NodeJS.Timeout) => {
	clearInterval(heartbeat)

	try {
		const redis = await redisClient()
		await redis.del(getHeartbeatKey(runId))
	} catch (error) {
		console.error("redis.del failed:", error)
	}
}
