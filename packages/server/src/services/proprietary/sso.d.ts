export declare const getSSOProviders: () => Promise<{
    id: string;
    domain: string;
    providerId: string;
    issuer: string;
    oidcConfig: string | null;
    samlConfig: string | null;
}[]>;
export declare const requestToHeaders: (req: {
    headers?: Record<string, string | string[] | undefined>;
}) => Headers;
export declare const normalizeTrustedOrigin: (value: string) => string;
export declare const getOrganizationOwnerId: (organizationId: string) => Promise<string | null>;
//# sourceMappingURL=sso.d.ts.map