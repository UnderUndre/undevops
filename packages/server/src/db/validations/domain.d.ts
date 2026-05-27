import { z } from "zod";
export declare const domain: z.ZodObject<{
    host: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    path: z.ZodOptional<z.ZodString>;
    internalPath: z.ZodOptional<z.ZodString>;
    stripPath: z.ZodOptional<z.ZodBoolean>;
    port: z.ZodOptional<z.ZodNumber>;
    https: z.ZodOptional<z.ZodBoolean>;
    certificateType: z.ZodOptional<z.ZodEnum<{
        letsencrypt: "letsencrypt";
        none: "none";
        custom: "custom";
    }>>;
    customCertResolver: z.ZodString;
    middlewares: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const domainCompose: z.ZodObject<{
    host: z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>;
    path: z.ZodOptional<z.ZodString>;
    internalPath: z.ZodOptional<z.ZodString>;
    stripPath: z.ZodOptional<z.ZodBoolean>;
    port: z.ZodOptional<z.ZodNumber>;
    https: z.ZodOptional<z.ZodBoolean>;
    certificateType: z.ZodOptional<z.ZodEnum<{
        letsencrypt: "letsencrypt";
        none: "none";
        custom: "custom";
    }>>;
    customCertResolver: z.ZodString;
    serviceName: z.ZodString;
    middlewares: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
//# sourceMappingURL=domain.d.ts.map