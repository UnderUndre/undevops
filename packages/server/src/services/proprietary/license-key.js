import { db } from "@undevops/server/db";
import { user } from "@undevops/server/db/schema";
import { eq } from "drizzle-orm";
import { getOrganizationOwnerId } from "./sso";
export const hasValidLicense = async (organizationId) => {
    const ownerId = await getOrganizationOwnerId(organizationId);
    if (!ownerId) {
        return false;
    }
    const currentUser = await db.query.user.findFirst({
        where: eq(user.id, ownerId),
        columns: {
            enableEnterpriseFeatures: true,
            isValidEnterpriseLicense: true,
        },
    });
    return !!(currentUser?.enableEnterpriseFeatures &&
        currentUser?.isValidEnterpriseLicense);
};
