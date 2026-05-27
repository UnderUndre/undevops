import type { InferResultType } from "@undevops/server/types/with";
export type MariadbNested = InferResultType<"mariadb", {
    mounts: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const buildMariadb: (mariadb: MariadbNested) => Promise<void>;
//# sourceMappingURL=mariadb.d.ts.map