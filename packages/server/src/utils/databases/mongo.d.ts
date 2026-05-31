import type { InferResultType } from "@undevops/server/types/with";
export type MongoNested = InferResultType<"mongo", {
    mounts: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const buildMongo: (mongo: MongoNested) => Promise<void>;
//# sourceMappingURL=mongo.d.ts.map