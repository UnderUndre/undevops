import { db } from "./index";
import { organization } from "./schema/account";
import { user } from "./schema/user";
import { projects } from "./schema/project";
import { environments } from "./schema/environment";
import { server } from "./schema/server";
import { nanoid } from "nanoid";

const ORG_ID = "seed_org_" + nanoid();
const USER_ID = "seed_user_" + nanoid();
const PROJECT_ID = "seed_proj_" + nanoid();
const ENV_ID = "seed_env_" + nanoid();
const SERVER_ID = "seed_srv_" + nanoid();

async function seed() {
	console.log("Seeding development data...");

	const [adminUser] = await db
		.insert(user)
		.values({
			id: USER_ID,
			email: "admin@seed.local",
			emailVerified: true,
			updatedAt: new Date(),
		})
		.returning();

	const [org] = await db
		.insert(organization)
		.values({
			id: ORG_ID,
			name: "Seed Organization",
			slug: "seed-org",
			ownerId: USER_ID,
			createdAt: new Date(),
		})
		.returning();

	const [proj] = await db
		.insert(projects)
		.values({
			projectId: PROJECT_ID,
			name: "Seed Project",
			description: "Development seed project",
			organizationId: ORG_ID,
			createdAt: new Date().toISOString(),
		})
		.returning();

	const [env] = await db
		.insert(environments)
		.values({
			environmentId: ENV_ID,
			name: "production",
			description: "Seed production environment",
			projectId: PROJECT_ID,
			createdAt: new Date().toISOString(),
		})
		.returning();

	const [srv] = await db
		.insert(server)
		.values({
			serverId: SERVER_ID,
			name: "Seed Server",
			organizationId: ORG_ID,
			serverStatus: "active",
			serverType: "deploy",
			ipAddress: "127.0.0.1",
			port: 22,
			username: "root",
			createdAt: new Date().toISOString(),
		})
		.returning();

	console.log("Seed data created:");
	console.log(`  Organization: ${org!.id}`);
	console.log(`  User: ${adminUser!.id}`);
	console.log(`  Project: ${proj!.projectId}`);
	console.log(`  Environment: ${env!.environmentId}`);
	console.log(`  Server: ${srv!.serverId}`);
	console.log("Done.");
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
