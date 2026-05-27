import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { audit } from "@/server/api/utils/audit";
import { plugins } from "@undevops/server/db/schema";

export const pluginRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const orgId = ctx.session.activeOrganizationId;
		return ctx.db
			.select()
			.from(plugins)
			.where(eq(plugins.organizationId, orgId))
			.orderBy(desc(plugins.installedAt));
	}),

	detail: protectedProcedure
		.input(z.object({ pluginId: z.string() }))
		.query(async ({ input, ctx }) => {
			const [row] = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.pluginId, input.pluginId))
				.limit(1);
			if (!row) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found" });
			}
			return row;
		}),

	enable: protectedProcedure
		.input(z.object({ pluginId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const [existing] = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.pluginId, input.pluginId))
				.limit(1);
			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found" });
			}
			await ctx.db
				.update(plugins)
				.set({ enabled: true, faulted: false, faultMessage: null })
				.where(eq(plugins.pluginId, input.pluginId));
			await audit(ctx, {
				action: "update",
				resourceType: "plugin",
				resourceId: input.pluginId,
				resourceName: existing.name,
			});
			return { success: true };
		}),

	disable: protectedProcedure
		.input(z.object({ pluginId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const [existing] = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.pluginId, input.pluginId))
				.limit(1);
			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found" });
			}
			await ctx.db
				.update(plugins)
				.set({ enabled: false })
				.where(eq(plugins.pluginId, input.pluginId));
			await audit(ctx, {
				action: "update",
				resourceType: "plugin",
				resourceId: input.pluginId,
				resourceName: existing.name,
			});
			return { success: true };
		}),

	remove: protectedProcedure
		.input(z.object({ pluginId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const [existing] = await ctx.db
				.select()
				.from(plugins)
				.where(eq(plugins.pluginId, input.pluginId))
				.limit(1);
			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Plugin not found" });
			}
			await ctx.db
				.delete(plugins)
				.where(eq(plugins.pluginId, input.pluginId));
			await audit(ctx, {
				action: "delete",
				resourceType: "plugin",
				resourceId: input.pluginId,
				resourceName: existing.name,
			});
			return { success: true };
		}),
});
