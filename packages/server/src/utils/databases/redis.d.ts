import type { InferResultType } from "@undevops/server/types/with";
export type RedisNested = InferResultType<"redis", {
    mounts: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const buildRedis: (redis: RedisNested) => Promise<void>;
//# sourceMappingURL=redis.d.ts.map