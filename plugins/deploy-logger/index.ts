import type {
	UndevopsPlugin,
	PreDeployPayload,
	PreDeployResult,
	PostDeployPayload,
	PostDeployResult,
	DeployFailedPayload,
	DeployFailedResult,
	PluginContext,
} from "@undevops/plugin-sdk";

export default class DeployLoggerPlugin implements UndevopsPlugin {
	async onPreDeploy(payload: PreDeployPayload, ctx: PluginContext): Promise<PreDeployResult> {
		ctx.logger.info("pre-deploy triggered", {
			deploymentId: payload.deploymentId,
			projectName: payload.projectName,
			environment: payload.environment,
			serverId: payload.serverId,
			branch: payload.branch,
			commitHash: payload.commitHash,
			trigger: payload.trigger,
		});
		return {};
	}

	async onPostDeploy(payload: PostDeployPayload, ctx: PluginContext): Promise<PostDeployResult> {
		ctx.logger.info("post-deploy completed", {
			deploymentId: payload.deploymentId,
			projectName: payload.projectName,
			environment: payload.environment,
			serverId: payload.serverId,
			totalDurationMs: payload.totalDurationMs,
			healthy: payload.healthStatus?.healthy,
		});
		return {};
	}

	async onDeployFailed(payload: DeployFailedPayload, ctx: PluginContext): Promise<DeployFailedResult> {
		ctx.logger.error("deploy-failed", {
			deploymentId: payload.deploymentId,
			projectName: payload.projectName,
			failureStage: payload.failureStage,
			errorMessage: payload.errorMessage,
			serverId: payload.serverId,
		});
		return {};
	}
}
