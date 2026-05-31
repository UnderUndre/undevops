import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { audit } from "../utils/audit";
import {
	listPendingActions,
	approvePendingAction,
	rejectPendingAction,
} from "@undevops/server/services/pending-action";

export const pendingActionRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const actions = await listPendingActions(ctx.session.activeOrganizationId);
		return actions;
	}),

	approve: protectedProcedure
		.input(
			z.object({
				actionId: z.string().min(1),
				note: z.string().max(512).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const result = await approvePendingAction(
				input.actionId,
				ctx.session.activeOrganizationId,
				ctx.user.id,
				input.note,
			);

			await audit(ctx, {
				action: "update",
				resourceType: "deployment",
				resourceId: input.actionId,
				resourceName: "pending-action-approve",
				metadata: { note: input.note },
			});

			return result;
		}),

	reject: protectedProcedure
		.input(
			z.object({
				actionId: z.string().min(1),
				note: z.string().max(512).optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			const result = await rejectPendingAction(
				input.actionId,
				ctx.session.activeOrganizationId,
				ctx.user.id,
				input.note,
			);

			await audit(ctx, {
				action: "update",
				resourceType: "deployment",
				resourceId: input.actionId,
				resourceName: "pending-action-reject",
				metadata: { note: input.note },
			});

			return result;
		}),
});
