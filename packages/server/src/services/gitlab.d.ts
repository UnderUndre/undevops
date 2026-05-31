import { type apiCreateGitlab, gitlab } from "@undevops/server/db/schema";
import type { z } from "zod";
export type Gitlab = typeof gitlab.$inferSelect;
export declare const createGitlab: (input: z.infer<typeof apiCreateGitlab>, organizationId: string, userId: string) => Promise<void>;
export declare const findGitlabById: (gitlabId: string) => Promise<{
    redirectUri: string | null;
    gitProviderId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: number | null;
    gitlabId: string;
    gitlabUrl: string;
    gitlabInternalUrl: string | null;
    applicationId: string | null;
    secret: string | null;
    groupName: string | null;
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
export declare const updateGitlab: (gitlabId: string, input: Partial<Gitlab>) => Promise<{
    gitlabId: string;
    gitlabUrl: string;
    gitlabInternalUrl: string | null;
    applicationId: string | null;
    redirectUri: string | null;
    secret: string | null;
    accessToken: string | null;
    refreshToken: string | null;
    groupName: string | null;
    expiresAt: number | null;
    gitProviderId: string;
}>;
//# sourceMappingURL=gitlab.d.ts.map