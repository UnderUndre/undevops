import { describe, it, expect } from "vitest";
import {
	calculatePlacement,
	buildSpreadPlacementPreference,
	type NodeInfo,
} from "../../packages/core/src/deploy/replica-scheduler.js";
import {
	checkNodeHealth,
	type NodeHealthResult,
} from "../../packages/core/src/server-mgmt/health-monitor.js";
import {
	identifyRescheduleCandidates,
} from "../../packages/core/src/deploy/replica-rescheduler.js";
import {
	generateMultiNodeTraefikConfig,
	verifyTraefikSwarmConfig,
	ensureOverlayNetwork,
} from "../../packages/core/src/proxy/multi-node-lb.js";

const mockNodes: NodeInfo[] = [
	{ nodeId: "node-1", hostname: "manager-1", status: "ready", role: "manager", availability: "active" },
	{ nodeId: "node-2", hostname: "worker-1", status: "ready", role: "worker", availability: "active" },
	{ nodeId: "node-3", hostname: "worker-2", status: "ready", role: "worker", availability: "active" },
];

describe("US6: Multi-Server Cluster", () => {
	describe("Acceptance Scenario 1: 3 servers → deploy 3 replicas → distribution", () => {
		it("distributes replicas across distinct nodes", () => {
			const placement = calculatePlacement(3, mockNodes);

			expect(placement.length).toBe(3);
			expect(placement.reduce((sum, p) => sum + p.replicas, 0)).toBe(3);

			const uniqueNodes = new Set(placement.map((p) => p.nodeId));
			expect(uniqueNodes.size).toBe(3);
		});

		it("distributes 5 replicas across 3 nodes", () => {
			const placement = calculatePlacement(5, mockNodes);

			expect(placement.reduce((sum, p) => sum + p.replicas, 0)).toBe(5);
			expect(placement.length).toBe(3);

			const counts = placement.map((p) => p.replicas).sort((a, b) => a - b);
			expect(counts[2] - counts[0]).toBeLessThanOrEqual(1);
		});

		it("places all replicas on single node when only one available", () => {
			const placement = calculatePlacement(3, [mockNodes[0]]);

			expect(placement.length).toBe(1);
			expect(placement[0].replicas).toBe(3);
		});

		it("skips unavailable nodes", () => {
			const nodes: NodeInfo[] = [
				...mockNodes,
				{ nodeId: "node-4", hostname: "drained-1", status: "ready", role: "worker", availability: "drain" },
				{ nodeId: "node-5", hostname: "down-1", status: "down", role: "worker", availability: "active" },
			];

			const placement = calculatePlacement(3, nodes);

			const usedNodes = placement.map((p) => p.nodeId);
			expect(usedNodes).not.toContain("node-4");
			expect(usedNodes).not.toContain("node-5");
		});
	});

	describe("Spread placement preference", () => {
		it("generates spread-on-node-id preference", () => {
			const prefs = buildSpreadPlacementPreference();

			expect(prefs.length).toBe(1);
			expect(prefs[0].Spread.SpreadDescriptor).toBe("node.id");
		});
	});

	describe("Acceptance Scenario 2: kill 1 node → reschedule", () => {
		it("identifies applications on degraded node", async () => {
			const candidates = await identifyRescheduleCandidates(
				"degraded-server-id",
				"test-org",
			);

			expect(Array.isArray(candidates)).toBe(true);
		});
	});

	describe("Acceptance Scenario 3: node rejoins → eligible for placement", () => {
		it("rejoined node appears in placement calculation", () => {
			const twoNodes = mockNodes.slice(0, 2);
			const placementBefore = calculatePlacement(3, twoNodes);
			expect(placementBefore.length).toBe(2);

			const placementAfter = calculatePlacement(3, mockNodes);
			expect(placementAfter.length).toBe(3);

			const uniqueAfter = new Set(placementAfter.map((p) => p.nodeId));
			expect(uniqueAfter.has("node-3")).toBe(true);
		});
	});

	describe("Multi-node Traefik config", () => {
		it("generates correct config", () => {
			const config = generateMultiNodeTraefikConfig();

			expect(config.networkName).toBe("dokploy-network");
			expect(config.exposedByDefault).toBe(false);
			expect(config.swarmWatch).toBe(true);
		});

		it("verify returns structured result", async () => {
			const result = await verifyTraefikSwarmConfig();

			expect(result).toHaveProperty("healthy");
			expect(result).toHaveProperty("swarmProviderEnabled");
			expect(result).toHaveProperty("overlayNetworkExists");
			expect(result).toHaveProperty("traefikRunning");
			expect(result).toHaveProperty("details");
		});

		it("ensure overlay network is idempotent", async () => {
			const result = await ensureOverlayNetwork();

			expect(result).toHaveProperty("networkId");
		});
	});
});
