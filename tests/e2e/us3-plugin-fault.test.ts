import { beforeEach, describe, expect, it, vi } from "vitest";

interface MockPlugin {
	pluginId: string;
	name: string;
	version: string;
	enabled: boolean;
	faulted: boolean;
	faultMessage: string | null;
	invokeCount: number;
}

function createFaultingPlugin(): MockPlugin {
	return {
		pluginId: "plug_fault",
		name: "faulting-plugin",
		version: "1.0.0",
		enabled: true,
		faulted: false,
		faultMessage: null,
		invokeCount: 0,
	};
}

interface HookPayload {
	eventType: string;
	deploymentId: string;
	timestamp: string;
}

class FaultIsolationHost {
	private hookHandlers = new Map<string, (payload: HookPayload) => Promise<void>>();
	private plugins = new Map<string, MockPlugin>();
	private deploymentSucceeded = false;

	installPlugin(plugin: MockPlugin) {
		this.plugins.set(plugin.name, { ...plugin });
	}

	registerHook(
		pluginName: string,
		hookName: string,
		handler: (payload: HookPayload) => Promise<void>,
	) {
		this.hookHandlers.set(`${pluginName}:${hookName}`, handler);
	}

	async dispatchHook(hookName: string, payload: HookPayload): Promise<void> {
		for (const [key, handler] of this.hookHandlers.entries()) {
			const [pluginName, hook] = key.split(":");
			if (hook !== hookName) continue;

			const plugin = this.plugins.get(pluginName);
			if (!plugin || !plugin.enabled) continue;

			try {
				await handler(payload);
				plugin.invokeCount++;
			} catch (err) {
				plugin.faulted = true;
				plugin.faultMessage =
					err instanceof Error ? err.message : "Unknown error";
			}
		}
	}

	markDeploymentSuccess() {
		this.deploymentSucceeded = true;
	}

	isDeploymentSucceeded() {
		return this.deploymentSucceeded;
	}

	getPlugin(name: string) {
		return this.plugins.get(name);
	}
}

describe("US3: Plugin throws → deployment continues, plugin faulted (FR-018)", () => {
	let host: FaultIsolationHost;

	beforeEach(() => {
		host = new FaultIsolationHost();
		vi.clearAllMocks();
	});

	it("should continue deployment when plugin hook throws", async () => {
		const plugin = createFaultingPlugin();
		host.installPlugin(plugin);

		const throwingHandler = vi.fn().mockRejectedValue(new Error("Hook crashed"));
		host.registerHook("faulting-plugin", "pre-deploy", throwingHandler);

		const payload: HookPayload = {
			eventType: "pre-deploy",
			deploymentId: "deploy_err1",
			timestamp: new Date().toISOString(),
		};

		await host.dispatchHook("pre-deploy", payload);
		host.markDeploymentSuccess();

		expect(host.isDeploymentSucceeded()).toBe(true);
		expect(throwingHandler).toHaveBeenCalledOnce();

		const updated = host.getPlugin("faulting-plugin");
		expect(updated?.faulted).toBe(true);
		expect(updated?.faultMessage).toBe("Hook crashed");
	});

	it("should set faultMessage for non-Error throws", async () => {
		const plugin = createFaultingPlugin();
		host.installPlugin(plugin);

		host.registerHook("faulting-plugin", "pre-deploy", async () => {
			throw "string error";
		});

		await host.dispatchHook("pre-deploy", {
			eventType: "pre-deploy",
			deploymentId: "deploy_err2",
			timestamp: new Date().toISOString(),
		});

		host.markDeploymentSuccess();

		expect(host.isDeploymentSucceeded()).toBe(true);
		const updated = host.getPlugin("faulting-plugin");
		expect(updated?.faulted).toBe(true);
		expect(updated?.faultMessage).toBe("Unknown error");
	});

	it("should not increment invokeCount on fault", async () => {
		const plugin = createFaultingPlugin();
		host.installPlugin(plugin);

		host.registerHook("faulting-plugin", "pre-deploy", async () => {
			throw new Error("boom");
		});

		await host.dispatchHook("pre-deploy", {
			eventType: "pre-deploy",
			deploymentId: "deploy_err3",
			timestamp: new Date().toISOString(),
		});

		const updated = host.getPlugin("faulting-plugin");
		expect(updated?.invokeCount).toBe(0);
	});

	it("should isolate faults between plugins", async () => {
		const faultingPlugin: MockPlugin = {
			pluginId: "plug_fault",
			name: "faulting-plugin",
			version: "1.0.0",
			enabled: true,
			faulted: false,
			faultMessage: null,
			invokeCount: 0,
		};
		const healthyPlugin: MockPlugin = {
			pluginId: "plug_ok",
			name: "healthy-plugin",
			version: "1.0.0",
			enabled: true,
			faulted: false,
			faultMessage: null,
			invokeCount: 0,
		};
		host.installPlugin(faultingPlugin);
		host.installPlugin(healthyPlugin);

		host.registerHook("faulting-plugin", "post-deploy", async () => {
			throw new Error("I broke");
		});
		const healthyHandler = vi.fn().mockResolvedValue(undefined);
		host.registerHook("healthy-plugin", "post-deploy", healthyHandler);

		const payload: HookPayload = {
			eventType: "post-deploy",
			deploymentId: "deploy_multi",
			timestamp: new Date().toISOString(),
		};

		await host.dispatchHook("post-deploy", payload);
		host.markDeploymentSuccess();

		expect(host.isDeploymentSucceeded()).toBe(true);
		expect(healthyHandler).toHaveBeenCalledOnce();

		const faulted = host.getPlugin("faulting-plugin");
		const healthy = host.getPlugin("healthy-plugin");

		expect(faulted?.faulted).toBe(true);
		expect(faulted?.faultMessage).toBe("I broke");
		expect(healthy?.faulted).toBe(false);
		expect(healthy?.invokeCount).toBe(1);
	});
});
