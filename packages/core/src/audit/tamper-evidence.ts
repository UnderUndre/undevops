import { createHash } from "node:crypto";

export interface AuditLogRow {
	id: string;
	organizationId: string | null;
	userId: string | null;
	userEmail: string;
	userRole: string;
	action: string;
	resourceType: string;
	resourceId: string | null;
	resourceName: string | null;
	metadata: string | null;
	createdAt: Date;
	actor_type: string;
	actor_id: string | null;
	payload: Record<string, unknown> | null;
	row_hash: string | null;
	previous_hash: string | null;
}

export interface IntegrityAlert {
	level: "critical";
	event: "audit_chain_broken";
	breakAt: number;
	expectedHash: string;
	foundHash: string;
	timestamp: string;
}

function serializeValue(val: unknown): string {
	if (val === null || val === undefined) {
		return "0:";
	}
	if (val instanceof Date) {
		const s = val.toISOString();
		return `${s.length}:${s}`;
	}
	if (typeof val === "object") {
		const sortedStr = JSON.stringify(val, Object.keys(val as Record<string, unknown>).sort());
		return `${sortedStr.length}:${sortedStr}`;
	}
	const s = String(val);
	return `${s.length}:${s}`;
}

export function computeRowHash(
	row: any,
	previousHash: string | null,
): string {
	const { row_hash, previous_hash, ...data } = row;
	const fields = [
		"action",
		"actor_id",
		"actor_type",
		"createdAt",
		"id",
		"metadata",
		"organizationId",
		"payload",
		"resourceId",
		"resourceName",
		"resourceType",
		"userEmail",
		"userId",
		"userRole"
	];

	let payload = previousHash ?? "";
	for (const field of fields) {
		payload += "|" + serializeValue(data[field]);
	}
	return createHash("sha256").update(payload).digest("hex");
}

export function verifyChain(
	rows: AuditLogRow[],
): { valid: boolean; breakAt?: number } {
	let previousHash: string | null = null;

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const expected = computeRowHash(row, previousHash);

		if (row.row_hash !== expected) {
			return {
				valid: false,
				breakAt: i,
			};
		}

		previousHash = row.row_hash;
	}

	return { valid: true };
}

export function generateIntegrityAlert(
	breakAt: number,
	expectedHash: string,
	foundHash: string,
): IntegrityAlert {
	return {
		level: "critical",
		event: "audit_chain_broken",
		breakAt,
		expectedHash,
		foundHash,
		timestamp: new Date().toISOString(),
	};
}
