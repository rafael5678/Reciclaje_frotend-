import type { Session, User } from "../models/types";
import { authRepository } from "../repositories/authRepository";
import { ApiError } from "../repositories/http";
import { sessionRepository } from "../repositories/sessionRepository";

function keep(raw: { token: string; user: User }): Session {
  const session = { token: raw.token, user: raw.user };
  sessionRepository.save(session);
  return session;
}

export const authService = {
  async login(email: string, password: string): Promise<Session> {
    return keep(await authRepository.login(email, password));
  },
  async register(name: string, email: string, password: string): Promise<Session> {
    return keep(await authRepository.register(name, email, password));
  },
  async guest(): Promise<Session> {
    return keep(await authRepository.guest());
  },
  async restore(): Promise<Session | null> {
    const saved = sessionRepository.load();
    if (!saved) return null;
    try {
      const user = await authRepository.me(saved.token);
      return keep({ token: saved.token, user });
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) return saved;
      sessionRepository.clear();
      return null;
    }
  },
  logout() {
    sessionRepository.clear();
  },
  current(): Session | null {
    return sessionRepository.load();
  },
};
