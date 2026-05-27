import { webServerSettings } from "@undevops/server/db/schema";
/**
 * Get the web server settings (singleton - only one row should exist)
 */
export declare const getWebServerSettings: () => Promise<{
    certificateType: "letsencrypt" | "none" | "custom";
    createdAt: Date | null;
    id: string;
    updatedAt: Date;
    host: string | null;
    https: boolean;
    enableDockerCleanup: boolean;
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
    serverIp: string | null;
    letsEncryptEmail: string | null;
    sshPrivateKey: string | null;
    logCleanupCron: string | null;
    whitelabelingConfig: {
        appName: string | null;
        appDescription: string | null;
        logoUrl: string | null;
        faviconUrl: string | null;
        customCss: string | null;
        loginLogoUrl: string | null;
        supportUrl: string | null;
        docsUrl: string | null;
        errorPageTitle: string | null;
        errorPageDescription: string | null;
        metaTitle: string | null;
        footerText: string | null;
    } | null;
    cleanupCacheApplications: boolean;
    cleanupCacheOnPreviews: boolean;
    cleanupCacheOnCompose: boolean;
}>;
/**
 * Update web server settings
 */
export declare const updateWebServerSettings: (updates: Partial<typeof webServerSettings.$inferInsert>) => Promise<{
    id: string;
    serverIp: string | null;
    certificateType: "letsencrypt" | "none" | "custom";
    https: boolean;
    host: string | null;
    letsEncryptEmail: string | null;
    sshPrivateKey: string | null;
    enableDockerCleanup: boolean;
    logCleanupCron: string | null;
    metricsConfig: {
        server: {
            type: "Dokploy" | "Remote";
            refreshRate: number;
            port: number;
            token: string;
            urlCallback: string;
            retentionDays: number;
            cronJob: string;
            thresholds: {
                cpu: number;
                memory: number;
            };
        };
        containers: {
            refreshRate: number;
            services: {
                include: string[];
                exclude: string[];
            };
        };
    };
    whitelabelingConfig: {
        appName: string | null;
        appDescription: string | null;
        logoUrl: string | null;
        faviconUrl: string | null;
        customCss: string | null;
        loginLogoUrl: string | null;
        supportUrl: string | null;
        docsUrl: string | null;
        errorPageTitle: string | null;
        errorPageDescription: string | null;
        metaTitle: string | null;
        footerText: string | null;
    } | null;
    cleanupCacheApplications: boolean;
    cleanupCacheOnPreviews: boolean;
    cleanupCacheOnCompose: boolean;
    createdAt: Date | null;
    updatedAt: Date;
}>;
//# sourceMappingURL=web-server-settings.d.ts.map