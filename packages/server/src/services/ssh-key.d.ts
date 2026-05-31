import { type apiCreateSshKey, type apiFindOneSshKey, type apiRemoveSshKey, type apiUpdateSshKey } from "@undevops/server/db/schema";
import type { z } from "zod";
export declare const createSshKey: (input: z.infer<typeof apiCreateSshKey>) => Promise<void>;
export declare const removeSSHKeyById: (sshKeyId: z.infer<typeof apiRemoveSshKey>["sshKeyId"]) => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    sshKeyId: string;
    privateKey: string;
    publicKey: string;
    lastUsedAt: string | null;
}>;
export declare const updateSSHKeyById: ({ sshKeyId, ...input }: z.infer<typeof apiUpdateSshKey>) => Promise<{
    sshKeyId: string;
    privateKey: string;
    publicKey: string;
    name: string;
    description: string | null;
    createdAt: string;
    lastUsedAt: string | null;
    organizationId: string;
}>;
export declare const findSSHKeyById: (sshKeyId: z.infer<typeof apiFindOneSshKey>["sshKeyId"]) => Promise<{
    name: string;
    createdAt: string;
    organizationId: string;
    description: string | null;
    sshKeyId: string;
    privateKey: string;
    publicKey: string;
    lastUsedAt: string | null;
}>;
//# sourceMappingURL=ssh-key.d.ts.map