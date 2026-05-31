import type { PluginContext, PluginApiClient, PreDeployPayload, PostDeployPayload, DeployFailedPayload, ServerAddedPayload, ServerRemovedPayload, ProjectCreatedPayload, ProjectDeletedPayload } from "./types/payloads.js";
interface TestContextOptions {
    settings?: Record<string, unknown>;
    permissions?: string[];
    apiOverrides?: Partial<PluginApiClient>;
}
export declare function createTestContext(opts?: TestContextOptions): PluginContext;
export declare const mockPayload: {
    preDeploy(overrides?: Partial<PreDeployPayload>): PreDeployPayload;
    postDeploy(overrides?: Partial<PostDeployPayload>): PostDeployPayload;
    deployFailed(overrides?: Partial<DeployFailedPayload>): DeployFailedPayload;
    serverAdded(overrides?: Partial<ServerAddedPayload>): ServerAddedPayload;
    serverRemoved(overrides?: Partial<ServerRemovedPayload>): ServerRemovedPayload;
    projectCreated(overrides?: Partial<ProjectCreatedPayload>): ProjectCreatedPayload;
    projectDeleted(overrides?: Partial<ProjectDeletedPayload>): ProjectDeletedPayload;
};
export {};
