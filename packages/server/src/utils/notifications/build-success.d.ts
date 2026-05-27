import type { Domain } from "@undevops/server/services/domain";
interface Props {
    projectName: string;
    applicationName: string;
    applicationType: string;
    buildLink: string;
    organizationId: string;
    domains: Domain[];
    environmentName: string;
}
export declare const sendBuildSuccessNotifications: ({ projectName, applicationName, applicationType, buildLink, organizationId, domains, environmentName, }: Props) => Promise<void>;
export {};
//# sourceMappingURL=build-success.d.ts.map