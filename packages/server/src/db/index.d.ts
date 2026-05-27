/**
 * Connection Pool Budget (per spec T034a):
 *
 * App            Pool Size   Notes
 * web            10          Next.js server actions + SSR
 * api            10          REST API endpoints
 * mcp-server     15          High-throughput MCP resource queries
 * scheduler      5           BullMQ job processing
 * cli            on-demand   No pool, single connection per command
 *
 * Total baseline: 40 connections
 * Postgres max_connections: 120 (recommended setting)
 * Headroom for burst: 80 connections
 *
 * If using PgBouncer (recommended for production):
 * - Pool mode: transaction
 * - Max client connections: 200
 * - Default pool size: 20
 */
import { and, eq } from "drizzle-orm";
import { type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { dbUrl } from "./constants";
import * as schema from "./schema";
export { and, eq };
export * from "./schema";
type Database = PostgresJsDatabase<typeof schema>;
export declare const db: Database;
export { dbUrl };
//# sourceMappingURL=index.d.ts.map