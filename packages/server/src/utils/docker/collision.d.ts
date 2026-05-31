import type { ComposeSpecification } from "./types";
export declare const addAppNameToPreventCollision: (composeData: ComposeSpecification, appName: string, isolatedDeploymentsVolume: boolean) => ComposeSpecification;
export declare const randomizeIsolatedDeploymentComposeFile: (composeId: string, suffix?: string) => Promise<string>;
export declare const randomizeDeployableSpecificationFile: (composeSpec: ComposeSpecification, isolatedDeploymentsVolume: boolean, suffix?: string) => ComposeSpecification;
//# sourceMappingURL=collision.d.ts.map