import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { logger } from "../logger.js";

const githubWebhookSchema = z.object({
	ref: z.string(),
	after: z.string(),
	repository: z.object({
		full_name: z.string(),
		clone_url: z.string().optional(),
	}).optional(),
});

const gitlabWebhookSchema = z.object({
	ref: z.string(),
	after: z.string(),
	project: z.object({
		path_with_namespace: z.string(),
		git_http_url: z.string().optional(),
	}).optional(),
});

const bitbucketWebhookSchema = z.object({
	push: z.object({
		changes: z.array(z.object({
			new: z.object({
				name: z.string(),
				target: z.object({
					hash: z.string(),
				}).optional(),
			}).optional(),
		})),
	}).optional(),
});

function verifyHmacSha256(payload: string, signature: string, secret: string): boolean {
	const expected = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
	const sigBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(expected);
	if (sigBuffer.length !== expectedBuffer.length) return false;
	return timingSafeEqual(sigBuffer, expectedBuffer);
}

function verifyHmacSha1(payload: string, signature: string, secret: string): boolean {
	const expected = createHmac("sha1", secret).update(payload).digest("hex");
	const sigBuffer = Buffer.from(signature);
	const expectedBuffer = Buffer.from(`sha1=${expected}`);
	if (sigBuffer.length !== expectedBuffer.length) return false;
	return timingSafeEqual(sigBuffer, expectedBuffer);
}

const webhooks = new Hono();

webhooks.post("/github", async (c) => {
	const signature = c.req.header("X-Hub-Signature-256");
	if (!signature) {
		return c.json({ error: "Missing X-Hub-Signature-256 header" }, 401);
	}

	const secret = process.env.WEBHOOK_GITHUB_SECRET;
	if (!secret) {
		logger.error("WEBHOOK_GITHUB_SECRET not configured");
		return c.json({ error: "Webhook not configured" }, 500);
	}

	const body = await c.req.text();
	if (!verifyHmacSha256(body, signature, secret)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	let jsonPayload: unknown;
	try {
		jsonPayload = JSON.parse(body);
	} catch {
		return c.json({ error: "Invalid JSON format" }, 400);
	}

	const parsed = githubWebhookSchema.safeParse(jsonPayload);
	if (!parsed.success) {
		return c.json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
	}

	const { ref, after, repository } = parsed.data;
	logger.info({ ref, after, repo: repository?.full_name }, "GitHub webhook received");

	return c.json({ status: "accepted", ref, commit: after }, 202);
});

webhooks.post("/gitlab", async (c) => {
	const token = c.req.header("X-Gitlab-Token");
	if (!token) {
		return c.json({ error: "Missing X-Gitlab-Token header" }, 401);
	}

	const secret = process.env.WEBHOOK_GITLAB_SECRET;
	if (!secret) {
		logger.error("WEBHOOK_GITLAB_SECRET not configured");
		return c.json({ error: "Webhook not configured" }, 500);
	}

	if (token !== secret) {
		return c.json({ error: "Invalid token" }, 401);
	}

	const body = await c.req.json();
	const parsed = gitlabWebhookSchema.safeParse(body);
	if (!parsed.success) {
		return c.json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
	}

	const { ref, after, project } = parsed.data;
	logger.info({ ref, after, repo: project?.path_with_namespace }, "GitLab webhook received");

	return c.json({ status: "accepted", ref, commit: after }, 202);
});

webhooks.post("/bitbucket", async (c) => {
	const signature = c.req.header("X-Hub-Signature");
	if (!signature) {
		return c.json({ error: "Missing X-Hub-Signature header" }, 401);
	}

	const secret = process.env.WEBHOOK_BITBUCKET_SECRET;
	if (!secret) {
		logger.error("WEBHOOK_BITBUCKET_SECRET not configured");
		return c.json({ error: "Webhook not configured" }, 500);
	}

	const body = await c.req.text();
	if (!verifyHmacSha1(body, signature, secret)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	let jsonPayload: unknown;
	try {
		jsonPayload = JSON.parse(body);
	} catch {
		return c.json({ error: "Invalid JSON format" }, 400);
	}

	const parsed = bitbucketWebhookSchema.safeParse(jsonPayload);
	if (!parsed.success) {
		return c.json({ error: "Invalid payload", details: parsed.error.flatten() }, 400);
	}

	logger.info({ changes: parsed.data.push?.changes?.length }, "Bitbucket webhook received");

	return c.json({ status: "accepted" }, 202);
});

export { webhooks };
