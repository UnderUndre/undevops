import { type apiCreatePatch, patch } from "@undevops/server/db/schema";
import type { z } from "zod";
export type Patch = typeof patch.$inferSelect;
export declare const createPatch: (input: z.infer<typeof apiCreatePatch>) => Promise<{
    type: "create" | "update" | "delete";
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
    enabled: boolean;
    filePath: string;
    content: string;
    patchId: string;
}>;
export declare const findPatchById: (patchId: string) => Promise<{
    type: "create" | "update" | "delete";
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
    enabled: boolean;
    filePath: string;
    content: string;
    patchId: string;
}>;
export declare const findPatchesByEntityId: (id: string, type: "application" | "compose") => Promise<{
    type: "create" | "update" | "delete";
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
    enabled: boolean;
    filePath: string;
    content: string;
    patchId: string;
}[]>;
export declare const findPatchByFilePath: (filePath: string, id: string, type: "application" | "compose") => Promise<{
    type: "create" | "update" | "delete";
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
    enabled: boolean;
    filePath: string;
    content: string;
    patchId: string;
} | undefined>;
export declare const updatePatch: (patchId: string, data: Partial<Patch>) => Promise<{
    patchId: string;
    type: "create" | "update" | "delete";
    filePath: string;
    enabled: boolean;
    content: string;
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
}>;
export declare const deletePatch: (patchId: string) => Promise<{
    type: "create" | "update" | "delete";
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
    enabled: boolean;
    filePath: string;
    content: string;
    patchId: string;
}>;
export declare const markPatchForDeletion: (filePath: string, entityId: string, entityType: "application" | "compose") => Promise<{
    type: "create" | "update" | "delete";
    createdAt: string;
    updatedAt: string | null;
    applicationId: string | null;
    composeId: string | null;
    enabled: boolean;
    filePath: string;
    content: string;
    patchId: string;
}>;
interface ApplyPatchesOptions {
    id: string;
    type: "application" | "compose";
    serverId: string | null;
}
export declare const generateApplyPatchesCommand: ({ id, type, serverId, }: ApplyPatchesOptions) => Promise<string>;
export {};
//# sourceMappingURL=patch.d.ts.map