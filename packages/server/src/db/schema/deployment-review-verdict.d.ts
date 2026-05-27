interface ReviewPayload {
    request: {
        changeDescription: string;
        diff?: string;
        environmentName: string;
        serviceName: string;
        previousDeployment?: {
            id: string;
            title: string;
            finishedAt: string;
        };
    };
    response: {
        raw: string;
        parsed: boolean;
        model: string;
        tokenUsage?: {
            prompt: number;
            completion: number;
        };
    };
}
export declare const deploymentReviewVerdicts: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "deployment_review_verdict";
    schema: undefined;
    columns: {
        verdictId: import("drizzle-orm/pg-core").PgColumn<{
            name: "verdictId";
            tableName: "deployment_review_verdict";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: true;
            isAutoincrement: false;
            hasRuntimeDefault: true;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        deploymentId: import("drizzle-orm/pg-core").PgColumn<{
            name: "deploymentId";
            tableName: "deployment_review_verdict";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        aiReviewerId: import("drizzle-orm/pg-core").PgColumn<{
            name: "aiReviewerId";
            tableName: "deployment_review_verdict";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        verdict: import("drizzle-orm/pg-core").PgColumn<{
            name: "verdict";
            tableName: "deployment_review_verdict";
            dataType: "string";
            columnType: "PgEnumColumn";
            data: "error" | "pass" | "fail" | "abstain";
            driverParam: string;
            notNull: true;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: ["pass", "fail", "abstain", "error"];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        reasoning: import("drizzle-orm/pg-core").PgColumn<{
            name: "reasoning";
            tableName: "deployment_review_verdict";
            dataType: "string";
            columnType: "PgText";
            data: string;
            driverParam: string;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        confidence: import("drizzle-orm/pg-core").PgColumn<{
            name: "confidence";
            tableName: "deployment_review_verdict";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        payload: import("drizzle-orm/pg-core").PgColumn<{
            name: "payload";
            tableName: "deployment_review_verdict";
            dataType: "json";
            columnType: "PgJsonb";
            data: ReviewPayload;
            driverParam: unknown;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {
            $type: ReviewPayload;
        }>;
        reviewedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "reviewed_at";
            tableName: "deployment_review_verdict";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
        durationMs: import("drizzle-orm/pg-core").PgColumn<{
            name: "duration_ms";
            tableName: "deployment_review_verdict";
            dataType: "number";
            columnType: "PgInteger";
            data: number;
            driverParam: string | number;
            notNull: false;
            hasDefault: false;
            isPrimaryKey: false;
            isAutoincrement: false;
            hasRuntimeDefault: false;
            enumValues: undefined;
            baseColumn: never;
            identity: undefined;
            generated: undefined;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export declare const deploymentReviewVerdictsRelations: import("drizzle-orm").Relations<"deployment_review_verdict", {
    deployment: import("drizzle-orm").One<"deployment", true>;
    reviewer: import("drizzle-orm").One<"ai_reviewer", true>;
}>;
export {};
//# sourceMappingURL=deployment-review-verdict.d.ts.map