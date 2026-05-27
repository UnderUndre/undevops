import type { InferResultType } from "@undevops/server/types/with";
export type LibsqlNested = InferResultType<"libsql", {
    mounts: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const buildLibsql: (libsql: LibsqlNested) => Promise<void>;
//# sourceMappingURL=libsql.d.ts.map