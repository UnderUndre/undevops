import type { ConnectionOptions } from "bullmq";

const getRedisConfig = (): ConnectionOptions => {
	const redisUrl = process.env.REDIS_URL;
	if (redisUrl) {
		try {
			const parsed = new URL(redisUrl);
			return {
				host: parsed.hostname,
				port: parsed.port ? Number(parsed.port) : 6379,
				...(parsed.password && { password: decodeURIComponent(parsed.password) }),
			};
		} catch (e) {
			console.error("Failed to parse REDIS_URL, falling back:", e);
		}
	}

	return {
		host: process.env.REDIS_HOST || (process.env.NODE_ENV === "production" ? "dokploy-redis" : "127.0.0.1"),
	};
};

export const redisConfig: ConnectionOptions = getRedisConfig();
