import { z } from "zod";

export const jobQueueSchema = z.discriminatedUnion("type", [
	z.object({
		cronSchedule: z.string(),
		type: z.literal("backup"),
		backupId: z.string(),
	}),
	z.object({
		cronSchedule: z.string(),
		type: z.literal("server"),
		serverId: z.string(),
	}),
	z.object({
		cronSchedule: z.string(),
		type: z.literal("schedule"),
		scheduleId: z.string(),
		timezone: z.string().optional(),
	}),
	z.object({
		cronSchedule: z.string(),
		type: z.literal("volume-backup"),
		volumeBackupId: z.string(),
	}),
	z.object({
		cronSchedule: z.string(),
		type: z.literal("control-plane-backup"),
		destinationId: z.string(),
	}),
	z.object({
		cronSchedule: z.string(),
		type: z.literal("integrity-scan"),
	}),
	z.object({
		cronSchedule: z.string(),
		type: z.literal("log-rotation"),
	}),
]);

export type QueueJob = z.infer<typeof jobQueueSchema>;
