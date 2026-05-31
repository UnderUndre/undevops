import { beforeEach, describe, expect, it, vi } from "vitest";

class PluginPermissionError extends Error {
	constructor(
		public readonly permission: string,
		public readonly pluginName: string,
	) {
		super(
			`Plugin "${pluginName}" lacks permission: ${permission}`,
		);
		this.name = "PluginPermissionError";
	}
}

interface PermissionCheck {
	pluginName: string;
	permission: string;
	granted: boolean;
}

class MockPluginApiClient {
	private grantedPermissions: Set<string>;
	private permissionChecks: PermissionCheck[] = [];

	constructor(
		private pluginName: string,
		granted: string[],
	) {
		this.grantedPermissions = new Set(granted);
	}

	async requirePermission(permission: string): Promise<void> {
		const granted = this.grantedPermissions.has(permission);
		this.permissionChecks.push({
			pluginName: this.pluginName,
			permission,
			granted,
		});
		if (!granted) {
			throw new PluginPermissionError(permission, this.pluginName);
		}
	}

	getPermissionChecks(): PermissionCheck[] {
		return this.permissionChecks;
	}
}

describe("US3: Plugin permission → prompted/check occurs", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should throw PluginPermissionError when permission not granted", async () => {
		const client = new MockPluginApiClient("test-plugin", ["deployment:read"]);

		await expect(
			client.requirePermission("deployment:write"),
		).rejects.toThrow(PluginPermissionError);

		const checks = client.getPermissionChecks();
		expect(checks).toHaveLength(1);
		expect(checks[0]?.permission).toBe("deployment:write");
		expect(checks[0]?.granted).toBe(false);
	});

	it("should succeed when permission is granted", async () => {
		const client = new MockPluginApiClient("test-plugin", [
			"deployment:read",
			"deployment:write",
		]);

		await expect(
			client.requirePermission("deployment:read"),
		).resolves.toBeUndefined();

		const checks = client.getPermissionChecks();
		expect(checks).toHaveLength(1);
		expect(checks[0]?.granted).toBe(true);
	});

	it("should check multiple permissions in sequence", async () => {
		const client = new MockPluginApiClient("test-plugin", [
			"server:read",
			"project:read",
		]);

		await client.requirePermission("server:read");
		await expect(
			client.requirePermission("server:write"),
		).rejects.toThrow(PluginPermissionError);
		await client.requirePermission("project:read");

		const checks = client.getPermissionChecks();
		expect(checks).toHaveLength(3);
		expect(checks[0]?.granted).toBe(true);
		expect(checks[1]?.granted).toBe(false);
		expect(checks[2]?.granted).toBe(true);
	});

	it("should record plugin name in error", async () => {
		const client = new MockPluginApiClient("my-cool-plugin", []);

		try {
			await client.requirePermission("admin:full");
		} catch (err) {
			expect(err).toBeInstanceOf(PluginPermissionError);
			const permErr = err as PluginPermissionError;
			expect(permErr.pluginName).toBe("my-cool-plugin");
			expect(permErr.permission).toBe("admin:full");
			expect(permErr.message).toContain("my-cool-plugin");
			expect(permErr.message).toContain("admin:full");
		}
	});

	it("should handle empty permissions array", async () => {
		const client = new MockPluginApiClient("no-perm-plugin", []);

		await expect(
			client.requirePermission("any:permission"),
		).rejects.toThrow(PluginPermissionError);

		const checks = client.getPermissionChecks();
		expect(checks).toHaveLength(1);
		expect(checks[0]?.granted).toBe(false);
	});
});
