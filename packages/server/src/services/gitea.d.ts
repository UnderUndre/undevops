import { type apiCreateGitea, gitea } from "@undevops/server/db/schema";
import type { z } from "zod";
export type Gitea = typeof gitea.$inferSelect;
export declare const createGitea: (input: z.infer<typeof apiCreateGitea>, organizationId: string, userId: string) => Promise<{
    giteaId: string;
    clientId: string | null;
    giteaUrl: string;
}>;
export declare const findGiteaById: (giteaId: string) => Promise<{
    giteaId: string;
    giteaUrl: string;
    giteaInternalUrl: string | null;
    redirectUri: string | null;
    clientId: string | null;
    clientSecret: string | null;
    gitProviderId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    scopes: string | null;
    lastAuthenticatedAt: number | null;
    gitProvider: {
        name: string;
        gitProviderId: string;
        providerType: "gitea" | "github" | "gitlab" | "bitbucket";
        createdAt: string;
        organizationId: string;
        userId: string;
        sharedWithOrganization: boolean;
    };
}>;
export declare const updateGitea: (giteaId: string, input: Partial<Gitea>) => Promise<{
    giteaId: string;
    giteaUrl: string;
    giteaInternalUrl: string | null;
    redirectUri: string | null;
    clientId: string | null;
    clientSecret: string | null;
    gitProviderId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    scopes: string | null;
    lastAuthenticatedAt: number | null;
}>;
//# sourceMappingURL=gitea.d.ts.map