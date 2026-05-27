import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { audit } from "@/server/api/utils/audit";
import { aiReviewers } from "@undevops/server/db/schema/ai-reviewer";

const providerSchema = z.enum(["claude", "openai", "gemini", "codex", "custom"]);

const createSchema = z.object({
	name: z.string().min(1).max(128),
	provider: providerSchema,
	credentialRef: z.string().min(1),
	model: z.string().min(1),
	apiUrl: z.string().optional(),
	timeoutSeconds: z.number().int().min(5).max(300).optional(),
	configJson: z
		.object({
			systemPrompt: z.string().optional(),
			temperature: z.number().min(0).max(2).optional(),
			maxTokens: z.number().int().min(1).optional(),
			reviewFocus: z.array(z.enum(["security", "performance", "best_practices", "cost"])).optional(),
			customHeaders: z.record(z.string()).optional(),
		})
		.optional(),
});

const updateSchema = z.object({
	aiReviewerId: z.string(),
	name: z.string().min(1).max(128).optional(),
	provider: providerSchema.optional(),
	credentialRef: z.string().min(1).optional(),
	model: z.string().min(1).optional(),
	apiUrl: z.string().nullable().optional(),
	timeoutSeconds: z.number().int().min(5).max(300).optional(),
	configJson: z
		.object({
			systemPrompt: z.string().optional(),
			temperature: z.number().min(0).max(2).optional(),
			maxTokens: z.number().int().min(1).optional(),
			reviewFocus: z.array(z.enum(["security", "performance", "best_practices", "cost"])).optional(),
			customHeaders: z.record(z.string()).optional(),
		})
		.nullable()
		.optional(),
});

export const aiReviewerRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		return ctx.db
			.select()
			.from(aiReviewers)
			.where(eq(aiReviewers.organizationId, ctx.session.activeOrganizationId))
			.orderBy(desc(aiReviewers.createdAt));
	}),

	create: protectedProcedure.input(createSchema).mutation(async ({ input, ctx }) => {
		const [row] = await ctx.db
			.insert(aiReviewers)
			.values({
				name: input.name,
				provider: input.provider,
				credentialRef: input.credentialRef,
				model: input.model,
				apiUrl: input.apiUrl,
				timeoutSeconds: input.timeoutSeconds ?? 30,
				configJson: input.configJson,
				organizationId: ctx.session.activeOrganizationId,
				createdBy: ctx.user.id,
			})
			.returning({ aiReviewerId: aiReviewers.aiReviewerId, name: aiReviewers.name });

		await audit(ctx, {
			action: "create",
			resourceType: "settings",
			resourceId: row.aiReviewerId,
			resourceName: row.name,
		});

		return row;
	}),

	update: protectedProcedure.input(updateSchema).mutation(async ({ input, ctx }) => {
		const { aiReviewerId, ...updates } = input;
		const [existing] = await ctx.db
			.select()
			.from(aiReviewers)
			.where(eq(aiReviewers.aiReviewerId, aiReviewerId))
			.limit(1);

		if (!existing) {
			throw new TRPCError({ code: "NOT_FOUND", message: "AI reviewer not found" });
		}

		if (existing.organizationId !== ctx.session.activeOrganizationId) {
			throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
		}

		const [row] = await ctx.db
			.update(aiReviewers)
			.set(updates)
			.where(eq(aiReviewers.aiReviewerId, aiReviewerId))
			.returning({ aiReviewerId: aiReviewers.aiReviewerId, name: aiReviewers.name });

		await audit(ctx, {
			action: "update",
			resourceType: "settings",
			resourceId: row.aiReviewerId,
			resourceName: row.name,
		});

		return row;
	}),

	toggle: protectedProcedure
		.input(z.object({ aiReviewerId: z.string(), isEnabled: z.boolean() }))
		.mutation(async ({ input, ctx }) => {
			const [existing] = await ctx.db
				.select()
				.from(aiReviewers)
				.where(eq(aiReviewers.aiReviewerId, input.aiReviewerId))
				.limit(1);

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "AI reviewer not found" });
			}

			if (existing.organizationId !== ctx.session.activeOrganizationId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			await ctx.db
				.update(aiReviewers)
				.set({ isEnabled: input.isEnabled })
				.where(eq(aiReviewers.aiReviewerId, input.aiReviewerId));

			await audit(ctx, {
				action: "update",
				resourceType: "settings",
				resourceId: input.aiReviewerId,
				resourceName: existing.name,
			});

			return { success: true };
		}),

	remove: protectedProcedure
		.input(z.object({ aiReviewerId: z.string() }))
		.mutation(async ({ input, ctx }) => {
			const [existing] = await ctx.db
				.select()
				.from(aiReviewers)
				.where(eq(aiReviewers.aiReviewerId, input.aiReviewerId))
				.limit(1);

			if (!existing) {
				throw new TRPCError({ code: "NOT_FOUND", message: "AI reviewer not found" });
			}

			if (existing.organizationId !== ctx.session.activeOrganizationId) {
				throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
			}

			await ctx.db
				.delete(aiReviewers)
				.where(eq(aiReviewers.aiReviewerId, input.aiReviewerId));

			await audit(ctx, {
				action: "delete",
				resourceType: "settings",
				resourceId: input.aiReviewerId,
				resourceName: existing.name,
			});

			return { success: true };
		}),
});
