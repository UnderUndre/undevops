import { createLogger } from "../lib/logger.js";

const logger = createLogger("undevops:mcp:middleware:rate-limit");

interface RateLimitTier {
	windowMs: number;
	maxRequests: number;
	burst: number;
}

const TIERS: Record<string, RateLimitTier> = {
	read: { windowMs: 60_000, maxRequests: 120, burst: 30 },
	write: { windowMs: 60_000, maxRequests: 30, burst: 10 },
	exec: { windowMs: 60_000, maxRequests: 10, burst: 5 },
};

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: number;
	retryAfter?: number;
}

interface RateLimitStore {
	incrSlidingWindow(key: string, windowMs: number, maxRequests: number, burst: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }>;
}

class InMemoryRateLimitStore implements RateLimitStore {
	private windows = new Map<string, number[]>();

	async incrSlidingWindow(key: string, windowMs: number, maxRequests: number, burst: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
		const now = Date.now();
		const windowStart = now - windowMs;

		let timestamps = this.windows.get(key) ?? [];
		timestamps = timestamps.filter((t) => t > windowStart);

		const effectiveLimit = maxRequests + burst;
		const allowed = timestamps.length < effectiveLimit;

		if (allowed) {
			timestamps.push(now);
		}

		this.windows.set(key, timestamps);

		const oldest = timestamps[0];
		const resetAt = oldest ? oldest + windowMs : now + windowMs;

		return {
			allowed,
			remaining: Math.max(0, effectiveLimit - timestamps.length - (allowed ? 0 : 0)),
			resetAt,
		};
	}
}

class RedisRateLimitStore implements RateLimitStore {
	private redis: unknown;

	constructor(redisClient: unknown) {
		this.redis = redisClient;
	}

	async incrSlidingWindow(key: string, windowMs: number, maxRequests: number, burst: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
		const now = Date.now();
		const effectiveLimit = maxRequests + burst;

		const r = this.redis as {
			zremrangebyscore(key: string, min: string, max: string): Promise<unknown>;
			zcard(key: string): Promise<number>;
			zadd(key: string, ...args: unknown[]): Promise<unknown>;
			pexpire(key: string, ms: number): Promise<unknown>;
			zrange(key: string, start: number, stop: number, ...args: unknown[]): Promise<string[]>;
		};

		await r.zremrangebyscore(key, "-inf", String(now - windowMs));
		const count = await r.zcard(key);

		if (count >= effectiveLimit) {
			const oldest = await r.zrange(key, 0, 0, "WITHSCORES");
			const resetAt = oldest.length >= 2 ? Number(oldest[1]) + windowMs : now + windowMs;
			return { allowed: false, remaining: 0, resetAt };
		}

		await r.zadd(key, now, `${now}:${Math.random()}`);
		await r.pexpire(key, windowMs);

		return {
			allowed: true,
			remaining: effectiveLimit - count - 1,
			resetAt: now + windowMs,
		};
	}
}

let store: RateLimitStore = new InMemoryRateLimitStore();

export function setRateLimitStore(redisClient: unknown): void {
	store = new RedisRateLimitStore(redisClient);
	logger.info("rate limit store set to Redis");
}

export function setRateLimitStoreInstance(customStore: RateLimitStore): void {
	store = customStore;
}

export async function checkRateLimit(
	clientId: string,
	tier: keyof typeof TIERS,
): Promise<RateLimitResult> {
	const config = TIERS[tier];
	if (!config) {
		return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: 0 };
	}

	const now = Date.now();
	const key = `ratelimit:mcp:${tier}:${clientId}`;

	try {
		const result = await store.incrSlidingWindow(key, config.windowMs, config.maxRequests, config.burst);

		return {
			allowed: result.allowed,
			remaining: result.remaining,
			limit: config.maxRequests + config.burst,
			resetAt: result.resetAt,
			retryAfter: result.allowed ? undefined : Math.ceil((result.resetAt - now) / 1000),
		};
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		logger.error({ err: msg, clientId, tier }, "rate limit check failed, allowing request");
		return { allowed: true, remaining: Infinity, limit: Infinity, resetAt: 0 };
	}
}

export function getRateLimitHeaders(result: RateLimitResult, tier: string): Record<string, string> {
	const headers: Record<string, string> = {
		"X-RateLimit-Limit": String(result.limit),
		"X-RateLimit-Remaining": String(result.remaining),
		"X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
		"X-RateLimit-Tier": tier,
	};

	if (!result.allowed && result.retryAfter) {
		headers["Retry-After"] = String(result.retryAfter);
	}

	return headers;
}

export const RATE_LIMIT_ERROR_CODE = -32006;
export const RATE_LIMIT_ERROR_MESSAGE = "Rate limit exceeded";
