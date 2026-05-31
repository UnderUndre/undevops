import {
	type DockerNode,
	execAsync,
	execAsyncRemote,
	findServerById,
	getRemoteDocker,
} from "@undevops/server";
import { db } from "@undevops/server/db";
import { TRPCError } from "@trpc/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { audit } from "@/server/api/utils/audit";
import {
	applications,
	server,
} from "@/server/db/schema";
import { getLocalServerIp } from "@/server/wss/terminal";
import { createTRPCRouter, withPermission } from "../trpc";

export const clusterRouter = createTRPCRouter({
	topology: withPermission("server", "read").query(async ({ ctx }) => {
		const servers = await db
			.select()
			.from(server)
			.where(eq(server.organizationId, ctx.session.activeOrganizationId))
			.orderBy(desc(server.createdAt));

		const allApplications = await db
			.select({
				applicationId: applications.applicationId,
				name: applications.name,
				replicas: applications.replicas,
				applicationStatus: applications.applicationStatus,
				serverId: applications.serverId,
			})
			.from(applications)
			.innerJoin(server, eq(applications.serverId, server.serverId))
			.where(eq(server.organizationId, ctx.session.activeOrganizationId));

		const appByServer = new Map<string, typeof allApplications>();
		for (const app of allApplications) {
			const sid = app.serverId;
			if (!sid) continue;
			if (!appByServer.has(sid)) appByServer.set(sid, []);
			appByServer.get(sid)!.push(app);
		}

		const nodes = servers.map((s) => ({
			serverId: s.serverId,
			name: s.name,
			address: `${s.ipAddress}:${s.port}`,
			status: s.serverStatus,
			applications: (appByServer.get(s.serverId) || []).map((a) => ({
				applicationId: a.applicationId,
				name: a.name,
				replicas: a.replicas,
				status: a.applicationStatus,
			})),
		}));

		const totalNodes = nodes.length;
		const healthyNodes = nodes.filter((n) => n.status === "active").length;
		const degradedNodes = nodes.filter((n) => n.status === "inactive").length;
		const totalApplications = allApplications.length;

		return { nodes, totalNodes, totalApplications, healthyNodes, degradedNodes };
	}),

	nodeDetail: withPermission("server", "read")
		.input(z.object({ serverId: z.string() }))
		.query(async ({ input, ctx }) => {
			const s = await findServerById(input.serverId);
			if (s.organizationId !== ctx.session.activeOrganizationId) {
				throw new TRPCError({ code: "UNAUTHORIZED", message: "No access." });
			}

			const apps = await db
				.select({
					applicationId: applications.applicationId,
					name: applications.name,
					replicas: applications.replicas,
					applicationStatus: applications.applicationStatus,
				})
				.from(applications)
				.where(eq(applications.serverId, input.serverId));

			return {
				serverId: s.serverId,
				name: s.name,
				address: `${s.ipAddress}:${s.port}`,
				status: s.serverStatus,
				serverType: s.serverType,
				metricsConfig: s.metricsConfig,
				applications: apps,
				createdAt: s.createdAt,
			};
		}),

	getNodes: withPermission("server", "read")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const workers: DockerNode[] = await docker.listNodes();
			return workers;
		}),

	removeWorker: withPermission("server", "delete")
		.input(
			z.object({
				nodeId: z.string(),
				serverId: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			try {
				const drainCommand = `docker node update --availability drain ${input.nodeId}`;
				const removeCommand = `docker node rm ${input.nodeId} --force`;

				if (input.serverId) {
					await execAsyncRemote(input.serverId, drainCommand);
					await execAsyncRemote(input.serverId, removeCommand);
				} else {
					await execAsync(drainCommand);
					await execAsync(removeCommand);
				}
				await audit(ctx, {
					action: "delete",
					resourceType: "cluster",
					resourceId: input.nodeId,
					resourceName: input.nodeId,
				});
				return true;
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Error removing the node",
					cause: error,
				});
			}
		}),

	addWorker: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const result = await docker.swarmInspect();
			const docker_version = await docker.version();

			let ip = await getLocalServerIp();
			if (input.serverId) {
				const server = await findServerById(input.serverId);
				ip = server?.ipAddress;
			}

			return {
				command: `docker swarm join --token ${result.JoinTokens.Worker} ${ip}:2377`,
				version: docker_version.Version,
			};
		}),

	addManager: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const result = await docker.swarmInspect();
			const docker_version = await docker.version();

			let ip = await getLocalServerIp();
			if (input.serverId) {
				const server = await findServerById(input.serverId);
				ip = server?.ipAddress;
			}
			return {
				command: `docker swarm join --token ${result.JoinTokens.Manager} ${ip}:2377`,
				version: docker_version.Version,
			};
		}),
});
