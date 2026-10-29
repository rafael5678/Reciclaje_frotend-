import type { Session, User } from "../models/types";
import { authRepository } from "../repositories/authRepository";
import { ApiError } from "../repositories/http";
import { sessionRepository } from "../repositories/sessionRepository";

export type AuthResult = { session: Session; moved: number };

function keep(raw: { token: string; user: User; moved_scans?: number }): AuthResult {
  const session = { token: raw.token, user: raw.user };
  sessionRepository.save(session);
  return { session, moved: raw.moved_scans ?? 0 };
}

function guestToken(): string | null {
  const current = sessionRepository.load();
  return current?.user.guest ? current.token : null;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthResult> {
    return keep(await authRepository.login(email, password, guestToken()));
  },
  async register(name: string, email: string, password: string): Promise<AuthResult> {
    return keep(await authRepository.register(name, email, password, guestToken()));
  },
  async guest(): Promise<AuthResult> {
    return keep(await authRepository.guest());
  },
  async restore(): Promise<Session | null> {
    const saved = sessionRepository.load();
    if (!saved) return null;
    try {
      const user = await authRepository.me(saved.token);
      return keep({ token: saved.token, user }).session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) return saved;
      sessionRepository.clear();
      return null;
    }
  },
  isGuest(): boolean {
    return Boolean(sessionRepository.load()?.user.guest);
  },
  logout() {
    sessionRepository.clear();
  },
  current(): Session | null {
    return sessionRepository.load();
  },
};
