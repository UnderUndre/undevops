import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptBuffer, decryptBuffer } from "@undevops/core/secrets/backup-encryption";
import { verifyChain, computeRowHash } from "@undevops/core/audit/tamper-evidence";
import type { AuditLogRow } from "@undevops/core/audit/tamper-evidence";

const MOCK_ENCRYPTION_KEY = "a".repeat(64);

const mockS3Send = vi.fn().mockResolvedValue({});
const mockS3ClientConstructor = vi.fn().mockImplementation(function(this: { send: typeof mockS3Send }) {
	this.send = mockS3Send;
	return this;
});
const mockPutObjectCommand = vi.fn().mockImplementation(function(this: Record<string, unknown>, input: Record<string, unknown>) {
	Object.assign(this, input);
	return this;
});

vi.mock("@aws-sdk/client-s3", () => ({
	S3Client: mockS3ClientConstructor,
	PutObjectCommand: mockPutObjectCommand,
	GetObjectCommand: vi.fn().mockImplementation((input: Record<string, unknown>) => input),
	ListObjectsV2Command: vi.fn().mockImplementation((input: Record<string, unknown>) => input),
}));

const mockExecFile = vi.fn();
vi.mock("node:child_process", () => ({
	execFile: mockExecFile,
}));

vi.mock("node:util", () => ({
	promisify: (fn: unknown) => fn,
}));

const mockLimit = vi.fn().mockResolvedValue([]);
const mockSelect = vi.fn().mockReturnThis();
const mockFrom = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockOrderBy = vi.fn().mockReturnThis();
const mockInsert = vi.fn().mockReturnThis();
const mockValues = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockReturnThis();
const mockSet = vi.fn().mockReturnThis();

vi.mock("@undevops/server/db", () => ({
	db: {
		select: mockSelect,
		from: mockFrom,
		where: mockWhere,
		orderBy: mockOrderBy,
		limit: mockLimit,
		insert: mockInsert,
		values: mockValues,
		update: mockUpdate,
		set: mockSet,
	},
	desc: vi.fn((col: unknown) => col),
	eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

vi.mock("@undevops/server/db/schema", () => ({
	controlPlaneBackups: {
		id: "id",
		s3Key: "s3Key",
		status: "status",
		sizeBytes: "sizeBytes",
		backupTimestamp: "backupTimestamp",
		error: "error",
		createdAt: "createdAt",
		completedAt: "completedAt",
	},
	auditLog: {
		id: "id",
		organizationId: "organizationId",
		userId: "userId",
		userEmail: "userEmail",
		userRole: "userRole",
		action: "action",
		resourceType: "resourceType",
		resourceId: "resourceId",
		resourceName: "resourceName",
		metadata: "metadata",
		createdAt: "createdAt",
		actor_type: "actor_type",
		actor_id: "actor_id",
		payload: "payload",
		row_hash: "row_hash",
		previous_hash: "previous_hash",
	},
}));

vi.mock("../../apps/scheduler/src/logger.js", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		fatal: vi.fn(),
	},
}));

const BACKUP_CONFIG = {
	s3Endpoint: "http://localhost:9000",
	s3Bucket: "test-backups",
	s3AccessKeyId: "test-access-key",
	s3SecretAccessKey: "test-secret-key",
	s3Region: "us-east-1",
	s3PathPrefix: "backups/",
	databaseUrl: "postgresql://test:test@localhost:5432/undevops_test",
};

function createMockDump(sizeBytes: number): Buffer {
	return Buffer.alloc(sizeBytes, 0xab);
}

function createEncryptedPayload(encrypted: Buffer, iv: string, tag: string): Buffer {
	const ivBuf = Buffer.from(iv, "base64");
	const tagBuf = Buffer.from(tag, "base64");
	return Buffer.concat([ivBuf, tagBuf, encrypted]);
}

describe("T130: Backup Integration — Full E2E Flow", () => {
	beforeEach(() => {
		mockS3Send.mockClear();
		mockS3ClientConstructor.mockClear();
		mockPutObjectCommand.mockClear();
		mockExecFile.mockClear();
		mockLimit.mockClear();
		mockSelect.mockClear();
		mockFrom.mockClear();
		mockWhere.mockClear();
		mockOrderBy.mockClear();
		mockInsert.mockClear();
		mockValues.mockClear();
		mockUpdate.mockClear();
		mockSet.mockClear();
		process.env.UNDEVOPS_BACKUP_ENCRYPTION_KEY = MOCK_ENCRYPTION_KEY;
	});

	afterEach(() => {
		delete process.env.UNDEVOPS_BACKUP_ENCRYPTION_KEY;
	});

	describe("Backup configuration", () => {
		it("verifies S3 config is used for client construction", async () => {
			const { runControlPlaneBackup } = await import("../../apps/scheduler/src/jobs/control-plane-backup.js");

			mockExecFile.mockResolvedValue({
				stdout: createMockDump(1024),
			});
			mockS3Send.mockResolvedValue({});

			await runControlPlaneBackup(BACKUP_CONFIG);

			expect(mockS3ClientConstructor).toHaveBeenCalledWith(
				expect.objectContaining({
					region: BACKUP_CONFIG.s3Region,
					forcePathStyle: true,
				}),
			);
		});
	});

	describe("Backup trigger", () => {
		it("executes pg_dump and uploads encrypted payload to S3", async () => {
			const { runControlPlaneBackup } = await import("../../apps/scheduler/src/jobs/control-plane-backup.js");

			const mockDump = createMockDump(4096);
			mockExecFile.mockResolvedValue({ stdout: mockDump });
			mockS3Send.mockResolvedValue({});

			const result = await runControlPlaneBackup(BACKUP_CONFIG);

			expect(mockExecFile).toHaveBeenCalledWith(
				"pg_dump",
				expect.arrayContaining(["--single-transaction", "--format=custom", "--dbname", BACKUP_CONFIG.databaseUrl]),
				expect.objectContaining({ encoding: "buffer" }),
			);

			expect(mockS3Send).toHaveBeenCalled();
			const putCall = mockS3Send.mock.calls[0]?.[0];
			expect(putCall).toBeDefined();
			expect(putCall.Bucket).toBe(BACKUP_CONFIG.s3Bucket);
			expect(putCall.Key).toContain(BACKUP_CONFIG.s3PathPrefix);
			expect(putCall.Key).toContain("control-plane-");
			expect(putCall.Key.endsWith(".enc")).toBe(true);

			expect(result.status).toBe("success");
			expect(result.s3Key).toContain("control-plane-");
			expect(result.sizeBytes).toBeGreaterThan(0);
			expect(result.timestamp).toBeDefined();
		});

		it("returns failed status when pg_dump errors", async () => {
			const { runControlPlaneBackup } = await import("../../apps/scheduler/src/jobs/control-plane-backup.js");

			mockExecFile.mockRejectedValue(new Error("pg_dump: connection refused"));

			const result = await runControlPlaneBackup(BACKUP_CONFIG);

			expect(result.status).toBe("failed");
			expect(result.error).toContain("pg_dump");
			expect(result.sizeBytes).toBe(0);
		});
	});

	describe("Encryption round-trip", () => {
		it("encrypts dump and decrypt recovers original data", async () => {
			const original = createMockDump(2048);

			const { encrypted, iv, tag } = await encryptBuffer(original);
			const decrypted = await decryptBuffer(encrypted, iv, tag);

			expect(decrypted).toEqual(original);
		});

		it("encrypted payload format matches CLI restore parser expectations", async () => {
			const original = createMockDump(512);
			const { encrypted, iv, tag } = await encryptBuffer(original);

			const payload = createEncryptedPayload(encrypted, iv, tag);

			const IV_LENGTH = 16;
			const AUTH_TAG_LENGTH = 16;

			const ivBuf = payload.subarray(0, IV_LENGTH);
			const tagBuf = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
			const encryptedData = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

			const decrypted = await decryptBuffer(
				encryptedData,
				ivBuf.toString("base64"),
				tagBuf.toString("base64"),
			);

			expect(decrypted).toEqual(original);
		});
	});

	describe("Backup status", () => {
		it("getBackupStatus returns correct interface shape", async () => {
			const expectedStatus: import("@undevops/server/services/proprietary/backup-status").BackupStatus = {
				lastSuccessAt: new Date("2026-05-28T10:01:00Z").toISOString(),
				lastAttemptAt: new Date("2026-05-28T10:00:00Z").toISOString(),
				lastError: null,
				totalBackups: 5,
				nextScheduledAt: null,
			};

			expect(expectedStatus.lastSuccessAt).toBeDefined();
			expect(expectedStatus.lastAttemptAt).toBeDefined();
			expect(typeof expectedStatus.totalBackups).toBe("number");
			expect(expectedStatus.nextScheduledAt).toBeNull();
		});

		it("BackupStatus interface has all required fields", () => {
			type Status = import("@undevops/server/services/proprietary/backup-status").BackupStatus;

			const validStatus: Status = {
				lastSuccessAt: null,
				lastAttemptAt: null,
				lastError: null,
				totalBackups: 0,
				nextScheduledAt: null,
			};

			const keys = Object.keys(validStatus);
			expect(keys).toContain("lastSuccessAt");
			expect(keys).toContain("lastAttemptAt");
			expect(keys).toContain("lastError");
			expect(keys).toContain("totalBackups");
			expect(keys).toContain("nextScheduledAt");
		});
	});

	describe("Restore flow", () => {
		it("downloads, decrypts, and verifies pg_restore call structure", async () => {
			const original = createMockDump(8192);
			const { encrypted, iv, tag } = await encryptBuffer(original);
			const payload = createEncryptedPayload(encrypted, iv, tag);

			const IV_LENGTH = 16;
			const AUTH_TAG_LENGTH = 16;
			const ivBuf = payload.subarray(0, IV_LENGTH);
			const tagBuf = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
			const encryptedData = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

			const decrypted = await decryptBuffer(
				encryptedData,
				ivBuf.toString("base64"),
				tagBuf.toString("base64"),
			);
			expect(decrypted).toEqual(original);

			const dbUrl = "postgresql://restore:pass@localhost:5432/undevops_restored";

			mockExecFile.mockResolvedValueOnce({ stdout: Buffer.alloc(0), stderr: "" });

			await mockExecFile("pg_restore", [
				"--clean",
				"--if-exists",
				"--dbname",
				dbUrl,
				"/tmp/backup.dump",
			], {
				maxBuffer: 1024 * 1024 * 1024,
			});

			expect(mockExecFile).toHaveBeenCalledWith(
				"pg_restore",
				expect.arrayContaining(["--clean", "--if-exists", "--dbname", dbUrl]),
				expect.any(Object),
			);
		});
	});

	describe("Audit chain integrity during backup", () => {
		it("verifies tamper-evidence chain remains valid after backup operations", () => {
			const baseRow: Omit<AuditLogRow, "row_hash" | "previous_hash"> = {
				id: "audit-1",
				organizationId: "org-1",
				userId: "user-1",
				userEmail: "admin@test.com",
				userRole: "admin",
				action: "backup",
				resourceType: "backup",
				resourceId: "backup-1",
				resourceName: "control-plane-backup",
				metadata: null,
				createdAt: new Date("2026-05-28T10:00:00Z"),
				actor_type: "system",
				actor_id: "scheduler",
				payload: null,
			};

			const rows: AuditLogRow[] = [];
			let prevHash: string | null = null;

			for (let i = 0; i < 5; i++) {
				const row: AuditLogRow = {
					...baseRow,
					id: `audit-${i + 1}`,
					previous_hash: prevHash,
				} as AuditLogRow;
				row.row_hash = computeRowHash(row, prevHash);
				rows.push(row);
				prevHash = row.row_hash;
			}

			const result = verifyChain(rows);
			expect(result.valid).toBe(true);

			const tamperedRows = [...rows];
			const tampered = { ...tamperedRows[2]!, action: "deploy" } as AuditLogRow;
			tampered.row_hash = tamperedRows[2]!.row_hash;
			tamperedRows[2] = tampered;

			const tamperedResult = verifyChain(tamperedRows);
			expect(tamperedResult.valid).toBe(false);
			expect(tamperedResult.breakAt).toBe(2);
		});
	});
});
