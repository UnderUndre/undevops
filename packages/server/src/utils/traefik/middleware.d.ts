import type { Domain } from "@undevops/server/services/domain";
import type { ApplicationNested } from "../builders";
import type { FileConfig } from "./file-types";
export declare const addMiddleware: (config: FileConfig, middlewareName: string) => void;
export declare const deleteMiddleware: (config: FileConfig, middlewareName: string) => void;
export declare const deleteAllMiddlewares: (application: ApplicationNested) => Promise<void>;
export declare const loadMiddlewares: <T>() => T;
export declare const loadRemoteMiddlewares: (serverId: string) => Promise<FileConfig>;
export declare const writeMiddleware: (config: FileConfig) => void;
export declare const createPathMiddlewares: (app: ApplicationNested, domain: Domain) => Promise<void>;
export declare const removePathMiddlewares: (app: ApplicationNested, uniqueConfigKey: number) => Promise<void>;
//# sourceMappingURL=middleware.d.ts.map