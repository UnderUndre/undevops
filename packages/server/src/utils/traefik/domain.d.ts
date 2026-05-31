import type { Domain } from "@undevops/server/services/domain";
import type { ApplicationNested } from "../builders";
import type { HttpRouter } from "./file-types";
export declare const manageDomain: (app: ApplicationNested, domain: Domain) => Promise<void>;
export declare const removeDomain: (application: ApplicationNested, uniqueKey: number) => Promise<void>;
export declare const createRouterConfig: (app: ApplicationNested, domain: Domain, entryPoint: string) => Promise<HttpRouter>;
//# sourceMappingURL=domain.d.ts.map