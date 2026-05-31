import { TRPCError } from "@trpc/server";
import { createHash, randomBytes } from "crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { audit } from "../utils/audit";

const mcpTokenScopeSchema = z.enum(["read", "deploy", "admin"]);

export const mcpTokenRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const rows = await ctx.db.query.mcpTokens.findMany({
			where: (t, { eq: eqFn }) => eqFn(t.organizationId, ctx.session.activeOrganizationId),
			orderBy: [desc(
				// @ts-expect-error drizzle dynamic
				(t) => t.createdAt,
			)],
			columns: {
				mcpTokenId: true,
				name: true,
				scope: true,
				prefix: true,
				lastUsedAt: true,
				requestCount: true,
				revokedAt: true,
				createdAt: true,
			},
		});
		return rows;
	}),

	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(128),
				scope: mcpTokenScopeSchema,
				targetScope: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const raw = `mcp_${randomBytes(32).toString("hex")}`;
			const hash = createHash("sha256").update(raw).digest("hex");
			const prefix = raw.slice(0, 8);

			const result = await ctx.db.insert(
				// @ts-expect-error drizzle dynamic schema
				(ctx.db as unknown as { _: unknown }).mcpTokens ?? {},
			).values({
				name: input.name,
				scope: input.scope,
				targetScope: input.targetScope,
				tokenHash: hash,
				prefix,
				organizationId: ctx.session.activeOrganizationId,
				createdBy: ctx.user.id,
			}).returning({
				mcpTokenId: true,
			});

			await audit(ctx, {
				action: "create",
				resourceType: "settings",
				resourceId: result[0].mcpTokenId,
				resourceName: input.name,
			});

			return {
				mcpTokenId: result[0].mcpTokenId,
				token: raw,
			};
		}),

	revoke: protectedProcedure
		.input(
			z.object({
				mcpTokenId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await audit(ctx, {
				action: "delete",
				resourceType: "settings",
				resourceId: input.mcpTokenId,
				resourceName: "mcp-token-revoke",
			});

			return { success: true };
		}),
});
