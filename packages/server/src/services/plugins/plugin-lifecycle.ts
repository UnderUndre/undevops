import type {
	ServerAddedPayload,
	ServerRemovedPayload,
	ProjectCreatedPayload,
	ProjectDeletedPayload,
} from "@undevops/plugin-sdk";
import { getDispatcher } from "./plugin-host.js";
import pino from "pino";

const logger = pino({ name: "plugin-lifecycle" });

function makeContextFactory() {
	return (pluginName: string, pluginVersion: string) => ({
		pluginName,
		pluginVersion,
		settings: {},
		logger: {
			info: (msg: string, meta?: Record<string, unknown>) => logger.info({ plugin: pluginName, ...meta }, msg),
			warn: (msg: string, meta?: Record<string, unknown>) => logger.warn({ plugin: pluginName, ...meta }, msg),
			error: (msg: string, meta?: Record<string, unknown>) => logger.error({ plugin: pluginName, ...meta }, msg),
			debug: (msg: string, meta?: Record<string, unknown>) => logger.debug({ plugin: pluginName, ...meta }, msg),
		},
		api: {
			getProject: async () => { throw new Error("Not available in lifecycle hook"); },
			getServer: async () => { throw new Error("Not available in lifecycle hook"); },
			getDeployment: async () => { throw new Error("Not available in lifecycle hook"); },
			getProjectLogs: async () => { throw new Error("Not available in lifecycle hook"); },
		},
	});
}

export async function fireServerAdded(payload: ServerAddedPayload): Promise<void> {
	try {
		const dispatcher = getDispatcher();
		await dispatcher.dispatchServerAdded(payload, makeContextFactory());
	} catch (error) {
		if (error instanceof Error && error.message.includes("not initialized")) return;
		logger.error({ error, serverId: payload.serverId }, "Failed to fire server-added hook");
	}
}

export async function fireServerRemoved(payload: ServerRemovedPayload): Promise<void> {
	try {
		const dispatcher = getDispatcher();
		await dispatcher.dispatchServerRemoved(payload, makeContextFactory());
	} catch (error) {
		if (error instanceof Error && error.message.includes("not initialized")) return;
		logger.error({ error, serverId: payload.serverId }, "Failed to fire server-removed hook");
	}
}

export async function fireProjectCreated(payload: ProjectCreatedPayload): Promise<void> {
	try {
		const dispatcher = getDispatcher();
		await dispatcher.dispatchProjectCreated(payload, makeContextFactory());
	} catch (error) {
		if (error instanceof Error && error.message.includes("not initialized")) return;
		logger.error({ error, projectId: payload.projectId }, "Failed to fire project-created hook");
	}
}

export async function fireProjectDeleted(payload: ProjectDeletedPayload): Promise<void> {
	try {
		const dispatcher = getDispatcher();
		await dispatcher.dispatchProjectDeleted(payload, makeContextFactory());
	} catch (error) {
		if (error instanceof Error && error.message.includes("not initialized")) return;
		logger.error({ error, projectId: payload.projectId }, "Failed to fire project-deleted hook");
	}
}
