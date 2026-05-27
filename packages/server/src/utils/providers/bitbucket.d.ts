import type { apiBitbucketTestConnection, apiFindBitbucketBranches } from "@undevops/server/db/schema";
import { type Bitbucket } from "@undevops/server/services/bitbucket";
import type { InferResultType } from "@undevops/server/types/with";
import type { z } from "zod";
export type ApplicationWithBitbucket = InferResultType<"applications", {
    bitbucket: true;
}>;
export type ComposeWithBitbucket = InferResultType<"compose", {
    bitbucket: true;
}>;
export declare const getBitbucketCloneUrl: (bitbucketProvider: {
    apiToken?: string | null;
    bitbucketUsername?: string | null;
    appPassword?: string | null;
    bitbucketEmail?: string | null;
    bitbucketWorkspaceName?: string | null;
} | null, repoClone: string) => string;
export declare const getBitbucketHeaders: (bitbucketProvider: Bitbucket) => {
    Authorization: string;
};
interface CloneBitbucketRepository {
    appName: string;
    bitbucketRepository: string | null;
    bitbucketRepositorySlug?: string | null;
    bitbucketOwner: string | null;
    bitbucketBranch: string | null;
    bitbucketId: string | null;
    enableSubmodules: boolean;
    serverId: string | null;
    type?: "application" | "compose";
    outputPathOverride?: string;
}
export declare const cloneBitbucketRepository: ({ type, ...entity }: CloneBitbucketRepository) => Promise<string>;
export declare const getBitbucketRepositories: (bitbucketId?: string) => Promise<{
    name: string;
    url: string;
    slug: string;
    owner: {
        username: string;
    };
}[]>;
export declare const getBitbucketBranches: (input: z.infer<typeof apiFindBitbucketBranches>) => Promise<{
    name: string;
    commit: {
        sha: string;
    };
}[]>;
export declare const testBitbucketConnection: (input: z.infer<typeof apiBitbucketTestConnection>) => Promise<0>;
export {};
//# sourceMappingURL=bitbucket.d.ts.map