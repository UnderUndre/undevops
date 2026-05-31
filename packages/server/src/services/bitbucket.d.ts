import { type apiCreateBitbucket, type apiUpdateBitbucket, bitbucket } from "@undevops/server/db/schema";
import type { z } from "zod";
export type Bitbucket = typeof bitbucket.$inferSelect;
export declare const createBitbucket: (input: z.infer<typeof apiCreateBitbucket>, organizationId: string, userId: string) => Promise<void>;
export declare const findBitbucketById: (bitbucketId: string) => Promise<{
    gitProviderId: string;
    bitbucketId: string;
    bitbucketUsername: string | null;
    bitbucketEmail: string | null;
    appPassword: string | null;
    apiToken: string | null;
    bitbucketWorkspaceName: string | null;
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
export declare const updateBitbucket: (bitbucketId: string, input: z.infer<typeof apiUpdateBitbucket>) => Promise<{
    bitbucketId: string;
    bitbucketUsername: string | null;
    bitbucketEmail: string | null;
    appPassword: string | null;
    apiToken: string | null;
    bitbucketWorkspaceName: string | null;
    gitProviderId: string;
}>;
//# sourceMappingURL=bitbucket.d.ts.map