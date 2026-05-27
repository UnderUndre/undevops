/** App name: letters, numbers, dots, underscores, hyphens only (no spaces). Safe for shell/Docker. */
export declare const APP_NAME_REGEX: RegExp;
export declare const APP_NAME_MESSAGE = "App name can only contain letters, numbers, dots, underscores and hyphens";
/** Database password: blocks shell-dangerous characters like $ ! ' " \ / and spaces. */
export declare const DATABASE_PASSWORD_REGEX: RegExp;
export declare const DATABASE_PASSWORD_MESSAGE = "Password contains invalid characters. Please avoid: $ ! ' \" \\ / and space characters for database compatibility";
export declare const generateAppName: (type: string) => string;
export declare const cleanAppName: (appName?: string) => string | undefined;
export declare const buildAppName: (type: string, baseAppName?: string) => string;
//# sourceMappingURL=utils.d.ts.map