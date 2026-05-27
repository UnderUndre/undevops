import type { InferResultType } from "@undevops/server/types/with";
export type MysqlNested = InferResultType<"mysql", {
    mounts: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const buildMysql: (mysql: MysqlNested) => Promise<void>;
//# sourceMappingURL=mysql.d.ts.map