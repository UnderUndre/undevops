-- Audit log tamper-evidence: hash chain columns
-- Part of T135b: Audit-Log Tamper-Evidence

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS row_hash TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS previous_hash TEXT;

-- Index for chain traversal
CREATE INDEX IF NOT EXISTS auditLog_rowHash_idx ON audit_log (row_hash) WHERE row_hash IS NOT NULL;

-- NOTE: For production tamper-resistance, the application DB role should have
-- REVOKE UPDATE, DELETE ON audit_log. This requires a superuser to run:
--   REVOKE UPDATE, DELETE ON audit_log FROM <application_role>;
-- The application should use a separate restricted role for audit writes.
