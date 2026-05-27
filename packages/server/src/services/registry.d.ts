import { type apiCreateRegistry, registry } from "@undevops/server/db/schema";
import type { z } from "zod";
export type Registry = typeof registry.$inferSelect;
export declare function safeDockerLoginCommand(registry: string | undefined, user: string | undefined, pass: string | undefined): string;
export declare const createRegistry: (input: z.infer<typeof apiCreateRegistry>, organizationId: string) => Promise<{
    createdAt: string;
    organizationId: string;
    username: string;
    password: string;
    registryUrl: string;
    registryId: string;
    registryName: string;
    imagePrefix: string | null;
    registryType: "selfHosted" | "cloud";
}>;
export declare const removeRegistry: (registryId: string) => Promise<{
    createdAt: string;
    organizationId: string;
    username: string;
    password: string;
    registryUrl: string;
    registryId: string;
    registryName: string;
    imagePrefix: string | null;
    registryType: "selfHosted" | "cloud";
}>;
export declare const updateRegistry: (registryId: string, registryData: Partial<Registry> & {
    serverId?: string | null;
}) => Promise<{
    registryId: string;
    registryName: string;
    imagePrefix: string | null;
    username: string;
    password: string;
    registryUrl: string;
    createdAt: string;
    registryType: "selfHosted" | "cloud";
    organizationId: string;
}>;
export declare const findRegistryById: (registryId: string) => Promise<{
    createdAt: string;
    organizationId: string;
    username: string;
    registryUrl: string;
    registryId: string;
    registryName: string;
    imagePrefix: string | null;
    registryType: "selfHosted" | "cloud";
}>;
export declare const findAllRegistryByOrganizationId: (organizationId: string) => Promise<{
    createdAt: string;
    organizationId: string;
    username: string;
    password: string;
    registryUrl: string;
    registryId: string;
    registryName: string;
    imagePrefix: string | null;
    registryType: "selfHosted" | "cloud";
}[]>;
//# sourceMappingURL=registry.d.ts.map