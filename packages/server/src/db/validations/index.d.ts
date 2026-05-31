import { z } from "zod";
export declare const sshKeyCreate: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    publicKey: z.ZodString;
    privateKey: z.ZodString;
}, z.core.$strip>;
export declare const sshKeyUpdate: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const sshKeyType: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        rsa: "rsa";
        ed25519: "ed25519";
    }>>;
}, z.core.$strip>;
//# sourceMappingURL=index.d.ts.map