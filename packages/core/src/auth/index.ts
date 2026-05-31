export { auth, validateRequest } from "@undevops/server/lib/auth";
export type { AuthType } from "@undevops/server/lib/auth";

export interface ISession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface IAuthProvider {
  authenticate(credentials: Record<string, unknown>): Promise<ISession>;
  authorize(session: ISession, resource: string, action: string): Promise<boolean>;
  invalidate(sessionId: string): Promise<void>;
}
