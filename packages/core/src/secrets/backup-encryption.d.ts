export declare function encryptBuffer(buffer: Buffer): Promise<{
    encrypted: Buffer;
    iv: string;
    tag: string;
}>;
export declare function decryptBuffer(encrypted: Buffer, iv: string, tag: string): Promise<Buffer>;
