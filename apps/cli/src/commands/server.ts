import { Command, InvalidArgumentError } from "commander";
import { db } from "@undevops/server/db";
import { server } from "@undevops/server/db/schema";
import { eq } from "drizzle-orm";
import { getFormatter } from "../output/formatter.js";

function parsePort(value: string): number {
	const parsed = Number.parseInt(value, 10);
	if (Number.isNaN(parsed)) {
		throw new InvalidArgumentError("Port must be a valid number.");
	}
	if (parsed < 1 || parsed > 65535) {
		throw new InvalidArgumentError("Port must be between 1 and 65535.");
	}
	return parsed;
}

export const serverCommand = new Command("server")
	.description("Manage servers");

serverCommand.command("list")
	.description("List connected servers")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const rows = await db.select({
			serverId: server.serverId,
			name: server.name,
			ipAddress: server.ipAddress,
			port: server.port,
			status: server.serverStatus,
			type: server.serverType,
		}).from(server);
		fmt.output(rows, ["serverId", "name", "ipAddress", "port", "status", "type"]);
	});

serverCommand.command("add")
	.description("Add a server")
	.requiredOption("--name <name>", "Server name")
	.requiredOption("--ip <ip>", "IP address")
	.requiredOption("--port <port>", "SSH port", parsePort)
	.option("--username <username>", "SSH username", "root")
	.option("--ssh-key-id <id>", "SSH key ID")
	.option("--type <type>", "Server type (deploy|build)", "deploy")
	.option("--format <format>", "Output format", "table")
	.action(async (opts) => {
		const fmt = getFormatter(opts.format);
		const [row] = await db.insert(server).values({
			name: opts.name,
			ipAddress: opts.ip,
			port: opts.port,
			username: opts.username,
			sshKeyId: opts.sshKeyId,
			serverType: opts.type,
			createdAt: new Date().toISOString(),
		}).returning();
		fmt.output([row], ["serverId", "name", "ipAddress", "port", "status"]);
	});

serverCommand.command("remove")
	.description("Remove a server")
	.requiredOption("--id <id>", "Server ID")
	.action(async (opts) => {
		await db.delete(server).where(eq(server.serverId, opts.id));
		console.log(`Server ${opts.id} removed`);
	});
