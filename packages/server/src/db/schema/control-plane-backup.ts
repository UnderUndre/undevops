import { pgEnum, pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const controlPlaneBackupStatus = pgEnum(
	"control_plane_backup_status",
	["success", "failed", "running"],
);

export const controlPlaneBackups = pgTable("control_plane_backup", {
	id: text("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	s3Key: text("s3Key").notNull(),
	status: controlPlaneBackupStatus("status").notNull().default("running"),
	sizeBytes: integer("sizeBytes").default(0),
	backupTimestamp: text("backupTimestamp"),
	error: text("error"),
	createdAt: timestamp("createdAt", { withTimezone: true })
		.notNull()
		.$defaultFn(() => new Date()),
	completedAt: timestamp("completedAt", { withTimezone: true }),
});
