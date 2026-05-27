import type { InferResultType } from "@undevops/server/types/with";
export type PostgresNested = InferResultType<"postgres", {
    mounts: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const buildPostgres: (postgres: PostgresNested) => Promise<void>;
//# sourceMappingURL=postgres.d.ts.map