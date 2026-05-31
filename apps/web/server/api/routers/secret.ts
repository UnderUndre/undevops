import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { audit } from "@/server/api/utils/audit";

const secretScopeSchema = z.enum([
	"organization",
	"project",
	"environment",
	"application",
	"compose",
]);

export const secretRouter = createTRPCRouter({
	list: protectedProcedure
		.input(
			z.object({
				scope: secretScopeSchema,
				scopeId: z.string(),
			}),
		)
		.query(async ({ input, ctx }) => {
			return [] as any[];
		}),

	create: protectedProcedure
		.input(
			z.object({
				key: z.string().min(1),
				value: z.string().min(1),
				scope: secretScopeSchema,
				scopeTargetId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await audit(ctx, {
				action: "create",
				resourceType: "secret",
				resourceId: input.key,
				resourceName: input.key,
			});
			return { secretId: "temp", key: input.key };
		}),

	rotate: protectedProcedure
		.input(
			z.object({
				secretId: z.string(),
				newValue: z.string().min(1),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await audit(ctx, {
				action: "update",
				resourceType: "secret",
				resourceId: input.secretId,
				resourceName: "secret-rotation",
			});
			return { success: true };
		}),

	remove: protectedProcedure
		.input(
			z.object({
				secretId: z.string(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			await audit(ctx, {
				action: "delete",
				resourceType: "secret",
				resourceId: input.secretId,
				resourceName: "secret-deletion",
			});
			return { success: true };
		}),
});
