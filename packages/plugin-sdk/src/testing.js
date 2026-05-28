function createMockLogger() {
    return {
        info: () => { },
        warn: () => { },
        error: () => { },
        debug: () => { },
    };
}
function createMockApiClient(overrides) {
    const notImplemented = (method) => () => {
        throw new Error(`Mock API: ${method} not implemented. Provide apiOverrides.${method}`);
    };
    return {
        getProject: overrides?.getProject ?? notImplemented("getResponse"),
        getServer: overrides?.getServer ?? notImplemented("getServer"),
        getDeployment: overrides?.getDeployment ?? notImplemented("getDeployment"),
        getProjectLogs: overrides?.getProjectLogs ?? notImplemented("getProjectLogs"),
    };
}
export function createTestContext(opts) {
    return {
        pluginName: "test-plugin",
        pluginVersion: "0.0.1-test",
        settings: opts?.settings ?? {},
        logger: createMockLogger(),
        api: createMockApiClient(opts?.apiOverrides),
    };
}
const now = () => new Date().toISOString();
export const mockPayload = {
    preDeploy(overrides) {
        return {
            deploymentId: "dep_test_001",
            projectId: "proj_test_001",
            projectName: "test-project",
            projectSlug: "test-project",
            serverId: "srv_test_001",
            serverName: "test-server",
            environment: "production",
            trigger: "manual",
            actorType: "human",
            actorId: "user_test_001",
            branch: "main",
            commitHash: "abc123def456",
            timestamp: now(),
            ...overrides,
        };
    },
    postDeploy(overrides) {
        return {
            deploymentId: "dep_test_001",
            projectId: "proj_test_001",
            projectName: "test-project",
            projectSlug: "test-project",
            serverId: "srv_test_001",
            serverName: "test-server",
            environment: "production",
            trigger: "manual",
            actorType: "human",
            branch: "main",
            commitHash: "abc123def456",
            buildDurationMs: 45000,
            deployDurationMs: 12000,
            totalDurationMs: 57000,
            healthStatus: { healthy: true, httpStatusCode: 200, responseTimeMs: 50 },
            timestamp: now(),
            ...overrides,
        };
    },
    deployFailed(overrides) {
        return {
            deploymentId: "dep_test_001",
            projectId: "proj_test_001",
            projectName: "test-project",
            projectSlug: "test-project",
            serverId: "srv_test_001",
            serverName: "test-server",
            environment: "production",
            failureStage: "build",
            errorMessage: "Build failed: exit code 1",
            timestamp: now(),
            ...overrides,
        };
    },
    serverAdded(overrides) {
        return {
            serverId: "srv_test_001",
            serverName: "test-server",
            address: "192.168.1.100",
            port: 22,
            os: "ubuntu-22.04",
            cpuCores: 4,
            totalMemoryMB: 8192,
            dockerVersion: "24.0.7",
            tags: ["production"],
            actorType: "human",
            actorId: "user_test_001",
            timestamp: now(),
            ...overrides,
        };
    },
    serverRemoved(overrides) {
        return {
            serverId: "srv_test_001",
            serverName: "test-server",
            address: "192.168.1.100",
            reason: "manual",
            actorType: "human",
            actorId: "user_test_001",
            timestamp: now(),
            ...overrides,
        };
    },
    projectCreated(overrides) {
        return {
            projectId: "proj_test_001",
            projectName: "test-project",
            projectSlug: "test-project",
            serverId: "srv_test_001",
            serverName: "test-server",
            environment: "production",
            actorType: "human",
            actorId: "user_test_001",
            timestamp: now(),
            ...overrides,
        };
    },
    projectDeleted(overrides) {
        return {
            projectId: "proj_test_001",
            projectName: "test-project",
            projectSlug: "test-project",
            serverId: "srv_test_001",
            serverName: "test-server",
            reason: "manual",
            actorType: "human",
            actorId: "user_test_001",
            timestamp: now(),
            ...overrides,
        };
    },
};
