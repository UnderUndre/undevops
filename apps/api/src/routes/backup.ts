import { Hono } from "hono";
import { getBackupStatus } from "@undevops/server/services/proprietary/backup-status";
import { logger } from "../logger.js";

export const backupRouter = new Hono();

backupRouter.get("/status", async (c) => {
	try {
		const status = await getBackupStatus();
		return c.json(status);
	} catch (error) {
		logger.error({ err: error }, "Failed to get backup status");
		return c.json(
			{
				message:
					error instanceof Error ? error.message : "Failed to get backup status",
			},
			500,
		);
	}
});

backupRouter.post("/trigger", async (c) => {
	try {
		return c.json({ message: "Backup trigger requires scheduler integration" }, 501);
	} catch (error) {
		logger.error({ err: error }, "Failed to trigger backup");
		return c.json(
			{
				message:
					error instanceof Error ? error.message : "Failed to trigger backup",
			},
			500,
		);
	}
});
