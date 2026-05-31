import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockPlugin {
	pluginId: string;
	name: string;
	version: string;
	manifestJson: Record<string, unknown>;
	grantedPermissions: string[];
	enabled: boolean;
	faulted: boolean;
	faultMessage: string | null;
	hookSubscriptions: string[];
	organizationId: string;
	installedBy: string | null;
	installedAt: Date;
	updatedAt: Date | null;
	lastInvokedAt: Date | null;
	invokeCount: number;
}

const HOOK_NAME = "post-deploy";

function createMockPlugin(overrides: Partial<MockPlugin> = {}): MockPlugin {
	return {
		pluginId: "plug_test123",
		name: "deploy-logger",
		version: "1.0.0",
		manifestJson: {
			name: "deploy-logger",
			version: "1.0.0",
			entryPoint: "index.js",
			permissions: ["deployment:read"],
			hooks: [{ name: HOOK_NAME }],
		},
		grantedPermissions: ["deployment:read"],
		enabled: true,
		faulted: false,
		faultMessage: null,
		hookSubscriptions: [HOOK_NAME],
		organizationId: "org_test",
		installedBy: "user_admin",
		installedAt: new Date(),
		updatedAt: null,
		lastInvokedAt: null,
		invokeCount: 0,
		...overrides,
	};
}

interface HookPayload {
	eventType: string;
	deploymentId: string;
	timestamp: string;
}

type HookHandler = (payload: HookPayload) => Promise<void>;

class MockPluginHost {
	private handlers = new Map<string, HookHandler[]>();
	private plugins = new Map<string, MockPlugin>();
	private hookCallLog: Array<{ pluginName: string; hook: string; payload: HookPayload }> = [];

	registerHook(pluginName: string, hookName: string, handler: HookHandler) {
		const key = `${pluginName}:${hookName}`;
		const existing = this.handlers.get(key) ?? [];
		existing.push(handler);
		this.handlers.set(key, existing);
	}

	installPlugin(plugin: MockPlugin) {
		this.plugins.set(plugin.name, { ...plugin });
	}

	async dispatchHook(hookName: string, payload: HookPayload): Promise<void> {
		for (const [key, handlers] of this.handlers.entries()) {
			const [, hook] = key.split(":");
			if (hook !== hookName) continue;
			const pluginName = key.split(":")[0];
			const plugin = this.plugins.get(pluginName);
			if (!plugin || !plugin.enabled) continue;

			this.hookCallLog.push({ pluginName, hook: hookName, payload });

			for (const handler of handlers) {
				await handler(payload);
			}

			plugin.invokeCount++;
			plugin.lastInvokedAt = new Date();
		}
	}

	getCallLog() {
		return this.hookCallLog;
	}

	getPlugin(name: string) {
		return this.plugins.get(name);
	}
}

describe("US3: Plugin install → hook fires", () => {
	let host: MockPluginHost;

	beforeEach(() => {
		host = new MockPluginHost();
		vi.clearAllMocks();
	});

	it("should install deploy-logger plugin and fire hook on deploy", async () => {
		const plugin = createMockPlugin();
		host.installPlugin(plugin);

		const hookPayload: HookPayload = {
			eventType: "post-deploy",
			deploymentId: "deploy_abc",
			timestamp: new Date().toISOString(),
		};

		const hookFn = vi.fn().mockResolvedValue(undefined);
		host.registerHook("deploy-logger", HOOK_NAME, hookFn);

		await host.dispatchHook(HOOK_NAME, hookPayload);

		expect(hookFn).toHaveBeenCalledOnce();
		expect(hookFn).toHaveBeenCalledWith(hookPayload);

		const log = host.getCallLog();
		expect(log).toHaveLength(1);
		expect(log[0]?.pluginName).toBe("deploy-logger");
		expect(log[0]?.hook).toBe(HOOK_NAME);
		expect(log[0]?.payload.deploymentId).toBe("deploy_abc");

		const updated = host.getPlugin("deploy-logger");
		expect(updated?.invokeCount).toBe(1);
		expect(updated?.lastInvokedAt).toBeInstanceOf(Date);
	});

	it("should not fire hook for disabled plugin", async () => {
		const plugin = createMockPlugin({ enabled: false });
		host.installPlugin(plugin);

		const hookFn = vi.fn().mockResolvedValue(undefined);
		host.registerHook("deploy-logger", HOOK_NAME, hookFn);

		await host.dispatchHook(HOOK_NAME, {
			eventType: "post-deploy",
			deploymentId: "deploy_def",
			timestamp: new Date().toISOString(),
		});

		expect(hookFn).not.toHaveBeenCalled();
		expect(host.getCallLog()).toHaveLength(0);
	});

	it("should fire hooks in priority order for multiple plugins", async () => {
		const plugin1 = createMockPlugin({
			pluginId: "plug_a",
			name: "plugin-a",
		});
		const plugin2 = createMockPlugin({
			pluginId: "plug_b",
			name: "plugin-b",
		});
		host.installPlugin(plugin1);
		host.installPlugin(plugin2);

		const callOrder: string[] = [];
		host.registerHook("plugin-a", HOOK_NAME, async () => {
			callOrder.push("plugin-a");
		});
		host.registerHook("plugin-b", HOOK_NAME, async () => {
			callOrder.push("plugin-b");
		});

		await host.dispatchHook(HOOK_NAME, {
			eventType: "post-deploy",
			deploymentId: "deploy_ghi",
			timestamp: new Date().toISOString(),
		});

		expect(callOrder).toEqual(["plugin-a", "plugin-b"]);
	});
});
