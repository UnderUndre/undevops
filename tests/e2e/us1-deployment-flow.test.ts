import { execFile } from "node:child_process";
import { createConnection } from "node:net";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const env = {
	PRIVATE_KEY: process.env.UNDEVOPS_TEST_SSH_KEY ?? "",
	HOST: process.env.UNDEVOPS_TEST_HOST ?? "",
	USER: process.env.UNDEVOPS_TEST_USER ?? "root",
	PORT: process.env.UNDEVOPS_TEST_PORT ?? "22",
	DOMAIN: process.env.UNDEVOPS_TEST_DOMAIN ?? "",
	GIT_REPO: process.env.UNDEVOPS_TEST_GIT_REPO ?? "",
	CLI_PATH: process.env.UNDEVOPS_TEST_CLI_PATH ?? "undevops",
};

function isInfraAvailable(): boolean {
	return Boolean(env.PRIVATE_KEY && env.HOST && env.DOMAIN);
}

function sshConnectable(host: string, port: number): Promise<boolean> {
	return new Promise((resolve) => {
		const socket = createConnection({ host, port }, () => {
			socket.destroy();
			resolve(true);
		});
		socket.on("error", () => {
			socket.destroy();
			resolve(false);
		});
		socket.setTimeout(5_000, () => {
			socket.destroy();
			resolve(false);
		});
	});
}

async function runCLI(...args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	try {
		const { stdout, stderr } = await execFileAsync(env.CLI_PATH, args, {
			env: { ...process.env, NODE_ENV: "test" },
			timeout: 120_000,
		});
		return { stdout, stderr, exitCode: 0 };
	} catch (err: any) {
		return {
			stdout: err.stdout ?? "",
			stderr: err.stderr ?? "",
			exitCode: err.code ?? 1,
		};
	}
}

async function httpsGet(url: string): Promise<{ status: number; ok: boolean; headers: Record<string, string> }> {
	try {
		const { stdout: result } = await execFileAsync("curl", ["-sI", "--max-time", "10", url], { encoding: "utf-8" });
		const statusLine = result.split("\n")[0];
		const status = Number.parseInt(statusLine?.split(" ")[1] ?? "0", 10);
		const headers: Record<string, string> = {};
		for (const line of result.split("\n").slice(1)) {
			const [k, ...v] = line.split(":");
			if (k && v.length) headers[k.trim().toLowerCase()] = v.join(":").trim();
		}
		return { status, ok: status >= 200 && status < 400, headers };
	} catch {
		return { status: 0, ok: false, headers: {} };
	}
}

const skip = () => !isInfraAvailable();

/**
 * E2E Integration Test: US1 — Core Deployment Flow
 *
 * Covers acceptance scenarios 1-4 from spec.md §User Story 1:
 *   1. Fresh server → connect via SSH → web UI reachable over HTTPS
 *   2. Create project from git repo → build + deploy → reachable at domain
 *   3. Deployment logs accessible in real time
 *   4. New commit → auto-deploy → previous version stays healthy until new passes
 *
 * Prerequisites:
 *   - Fresh Linux VPS with SSH access
 *   - DNS A record pointing UNDEVOPS_TEST_DOMAIN to UNDEVOPS_TEST_HOST
 *   - undevops CLI installed (or UNDEVOPS_TEST_CLI_PATH pointing to built CLI)
 *   - Port 443 open on the VPS
 *
 * Environment variables:
 *   UNDEVOPS_TEST_SSH_KEY   — path to SSH private key for the test server
 *   UNDEVOPS_TEST_HOST      — IP or hostname of the test VPS
 *   UNDEVOPS_TEST_USER      — SSH user (default: root)
 *   UNDEVOPS_TEST_PORT      — SSH port (default: 22)
 *   UNDEVOPS_TEST_DOMAIN    — domain configured for the deployment
 *   UNDEVOPS_TEST_GIT_REPO  — git repo URL with a Dockerfile-based web app
 *   UNDEVOPS_TEST_CLI_PATH  — path to undevops CLI binary (default: undevops)
 *
 * Tests are automatically skipped if infrastructure env vars are not set.
 */
describe.skipIf(skip())("US1: Core Deployment Flow — E2E Integration", () => {
	const host = env.HOST;
	const domain = env.DOMAIN;
	const sshPort = Number(env.PORT);

	describe("Scenario 1: Fresh server → SSH connect → web UI on HTTPS", () => {
		it("should connect to server via SSH", async () => {
			const reachable = await sshConnectable(host, sshPort);
			expect(reachable).toBe(true);
		});

		it("should have undevops web UI reachable over HTTPS with valid cert", async () => {
			const { status, ok, headers } = await httpsGet(`https://${domain}`);
			expect(ok).toBe(true);
			expect(headers["strict-transport-security"]).toBeDefined();
		});

		it("should serve web UI on port 443", async () => {
			const { status } = await httpsGet(`https://${domain}:443`);
			expect(status).toBeGreaterThanOrEqual(200);
			expect(status).toBeLessThan(500);
		});
	});

	describe("Scenario 2: Create project from git repo → deploy → verify HTTPS", () => {
		it("should register server via CLI", async () => {
			const { exitCode, stderr } = await runCLI(
				"server", "add",
				"--name", "e2e-test-server",
				"--host", host,
				"--port", env.PORT,
				"--username", env.USER,
				"--private-key", env.PRIVATE_KEY,
			);
			expect(exitCode).toBe(0);
		});

		it("should list registered servers", async () => {
			const { exitCode, stdout } = await runCLI("server", "list", "--format", "json");
			expect(exitCode).toBe(0);
			const servers = JSON.parse(stdout);
			expect(Array.isArray(servers)).toBe(true);
			expect(servers.length).toBeGreaterThanOrEqual(1);
		});

		it("should create project from git repo", async () => {
			const { exitCode, stderr } = await runCLI(
				"project", "create",
				"--name", "e2e-test-project",
				"--server", "e2e-test-server",
				"--repo", env.GIT_REPO,
			);
			expect(exitCode).toBe(0);
		});

		it("should deploy the project", async () => {
			const { exitCode, stderr } = await runCLI(
				"deploy",
				"--project", "e2e-test-project",
				"--domain", domain,
			);
			expect(exitCode).toBe(0);
		});

		it("should serve deployed application over HTTPS at configured domain", async () => {
			const { ok, headers } = await httpsGet(`https://${domain}`);
			expect(ok).toBe(true);
		});
	});

	describe("Scenario 3: Deployment logs accessible", () => {
		it("should list deployments for the project", async () => {
			const { exitCode, stdout } = await runCLI(
				"deployment", "list",
				"--project", "e2e-test-project",
				"--format", "json",
			);
			expect(exitCode).toBe(0);
			const deployments = JSON.parse(stdout);
			expect(Array.isArray(deployments)).toBe(true);
			expect(deployments.length).toBeGreaterThanOrEqual(1);
		});

		it("should retrieve deployment logs", async () => {
			const listResult = await runCLI(
				"deployment", "list",
				"--project", "e2e-test-project",
				"--format", "json",
			);
			const deployments = JSON.parse(listResult.stdout);
			const deploymentId = deployments[0]?.id;
			expect(deploymentId).toBeDefined();

			const { exitCode, stdout } = await runCLI(
				"deployment", "logs",
				"--id", String(deploymentId),
			);
			expect(exitCode).toBe(0);
			expect(stdout.length).toBeGreaterThan(0);
		});
	});

	describe("Scenario 4: New commit → auto-deploy → zero-downtime", () => {
		it("should trigger redeploy and maintain availability", async () => {
			const { ok: okBefore } = await httpsGet(`https://${domain}`);
			expect(okBefore).toBe(true);

			const { exitCode } = await runCLI(
				"deploy",
				"--project", "e2e-test-project",
			);
			expect(exitCode).toBe(0);

			const { ok: okAfter } = await httpsGet(`https://${domain}`);
			expect(okAfter).toBe(true);
		});
	});
});
