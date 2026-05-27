import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getBackupEncryptionKey(): Buffer {
	const key = process.env.UNDEVOPS_BACKUP_ENCRYPTION_KEY;
	if (!key) {
		throw new Error("UNDEVOPS_BACKUP_ENCRYPTION_KEY environment variable is not set");
	}
	return scryptSync(key, "undevops-backup-salt", KEY_LENGTH);
}

export async function encryptBuffer(
	buffer: Buffer,
): Promise<{ encrypted: Buffer; iv: string; tag: string }> {
	const key = getBackupEncryptionKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv, {
		authTagLength: AUTH_TAG_LENGTH,
	});
	const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
	const tag = cipher.getAuthTag();
	return {
		encrypted,
		iv: iv.toString("base64"),
		tag: tag.toString("base64"),
	};
}

export async function decryptBuffer(
	encrypted: Buffer,
	iv: string,
	tag: string,
): Promise<Buffer> {
	const key = getBackupEncryptionKey();
	const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, "base64"), {
		authTagLength: AUTH_TAG_LENGTH,
	});
	decipher.setAuthTag(Buffer.from(tag, "base64"));
	return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}
