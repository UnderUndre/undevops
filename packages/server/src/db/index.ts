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

import { and, asc, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { dbUrl } from "./constants";
import * as schema from "./schema";

export { and, asc, desc, eq, gte, isNull, lte, sql };
export * from "./schema";

type Database = PostgresJsDatabase<typeof schema>;

/**
 * Evita problemas de redeclaración global en monorepos.
 * No usamos `declare global`.
 */
const globalForDb = globalThis as unknown as {
	db?: Database;
};

let dbConnection: Database;

if (process.env.NODE_ENV === "production") {
	// En producción no usamos global cache
	dbConnection = drizzle(postgres(dbUrl), {
		schema,
	});
} else {
	// En desarrollo reutilizamos conexión para evitar múltiples conexiones
	if (!globalForDb.db) {
		globalForDb.db = drizzle(postgres(dbUrl), {
			schema,
		});
	}

	dbConnection = globalForDb.db;
}

export const db: Database = dbConnection;

export { dbUrl };
