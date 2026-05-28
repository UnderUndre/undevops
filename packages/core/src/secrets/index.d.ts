export declare function encrypt(plaintext: string): {
    encrypted: string;
    iv: string;
    tag: string;
};
export declare function decrypt(encrypted: string, iv: string, tag: string): string;
export declare function rotate(plaintext: string): {
    encrypted: string;
    iv: string;
    tag: string;
};
export { encryptBuffer, decryptBuffer } from "./backup-encryption";
