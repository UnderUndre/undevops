import type { InferResultType } from "@undevops/server/types/with";
export type ApplicationNested = InferResultType<"applications", {
    mounts: true;
    security: true;
    redirects: true;
    ports: true;
    registry: true;
    buildRegistry: true;
    rollbackRegistry: true;
    deployments: true;
    environment: {
        with: {
            project: true;
        };
    };
}>;
export declare const getBuildCommand: (application: ApplicationNested) => Promise<string>;
export declare const mechanizeDockerContainer: (application: ApplicationNested) => Promise<void>;
export declare const getAuthConfig: (application: ApplicationNested) => {
    password: string;
    username: string;
    serveraddress: string;
} | undefined;
//# sourceMappingURL=index.d.ts.map