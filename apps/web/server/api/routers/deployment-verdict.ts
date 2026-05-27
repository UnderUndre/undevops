import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { deploymentReviewVerdicts } from "@undevops/server/db/schema/deployment-review-verdict";
import { aiReviewers } from "@undevops/server/db/schema/ai-reviewer";

export const deploymentVerdictRouter = createTRPCRouter({
	list: protectedProcedure
		.input(z.object({ deploymentId: z.string() }))
		.query(async ({ ctx, input }) => {
			const rows = await ctx.db
				.select({
					verdictId: deploymentReviewVerdicts.verdictId,
					verdict: deploymentReviewVerdicts.verdict,
					reasoning: deploymentReviewVerdicts.reasoning,
					confidence: deploymentReviewVerdicts.confidence,
					reviewedAt: deploymentReviewVerdicts.reviewedAt,
					durationMs: deploymentReviewVerdicts.durationMs,
					reviewerName: aiReviewers.name,
				})
				.from(deploymentReviewVerdicts)
				.innerJoin(aiReviewers, eq(deploymentReviewVerdicts.aiReviewerId, aiReviewers.aiReviewerId))
				.where(eq(deploymentReviewVerdicts.deploymentId, input.deploymentId))
				.orderBy(desc(deploymentReviewVerdicts.reviewedAt));

			return rows;
		}),
});
