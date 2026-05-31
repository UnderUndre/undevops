import type { custom, discord, email, gotify, lark, mattermost, ntfy, pushover, resend, slack, teams, telegram } from "@undevops/server/db/schema";
export declare const sendEmailNotification: (connection: typeof email.$inferInsert, subject: string, htmlContent: string, attachments?: {
    filename: string;
    content: Buffer;
}[]) => Promise<void>;
export declare const sendResendNotification: (connection: typeof resend.$inferInsert, subject: string, htmlContent: string) => Promise<void>;
export declare const sendDiscordNotification: (connection: typeof discord.$inferInsert, embed: any) => Promise<void>;
export declare const sendTelegramNotification: (connection: typeof telegram.$inferInsert, messageText: string, inlineButton?: {
    text: string;
    url: string;
}[][]) => Promise<void>;
export declare const sendSlackNotification: (connection: typeof slack.$inferInsert, message: any) => Promise<void>;
export declare const sendGotifyNotification: (connection: typeof gotify.$inferInsert, title: string, message: string) => Promise<void>;
export declare const sendNtfyNotification: (connection: typeof ntfy.$inferInsert, title: string, tags: string, actions: string, message: string) => Promise<void>;
export declare const sendMattermostNotification: (connection: typeof mattermost.$inferInsert, message: any) => Promise<void>;
export declare const sendCustomNotification: (connection: typeof custom.$inferInsert, payload: Record<string, any>) => Promise<Response>;
export declare const sendLarkNotification: (connection: typeof lark.$inferInsert, message: any) => Promise<void>;
export interface TeamsAdaptiveCardMessage {
    title: string;
    themeColor?: string;
    facts?: {
        name: string;
        value: string;
    }[];
    potentialAction?: {
        type: "Action.OpenUrl";
        title: string;
        url: string;
    };
}
export declare const sendTeamsNotification: (connection: typeof teams.$inferInsert, message: TeamsAdaptiveCardMessage) => Promise<void>;
export declare const sendPushoverNotification: (connection: typeof pushover.$inferInsert, title: string, message: string) => Promise<void>;
//# sourceMappingURL=utils.d.ts.map