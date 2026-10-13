import type { Session, User } from "../models/types";
import { authRepository } from "../repositories/authRepository";
import { sessionRepository } from "../repositories/sessionRepository";

export const DEMO = {
  email: "rafael@ecoscan.app",
  password: "ecoscan123",
};

export const authService = {
  async login(email: string, password: string): Promise<Session> {
    const raw = await authRepository.login(email, password);
    const session = { token: raw.token, user: raw.user as User };
    sessionRepository.save(session);
    return session;
  },
  async register(name: string, email: string, password: string): Promise<Session> {
    const raw = await authRepository.register(name, email, password);
    const session = { token: raw.token, user: raw.user as User };
    sessionRepository.save(session);
    return session;
  },
  async restore(): Promise<Session | null> {
    const saved = sessionRepository.load();
    if (!saved) return null;
    try {
      const user = await authRepository.me(saved.token);
      const session = { token: saved.token, user };
      sessionRepository.save(session);
      return session;
    } catch {
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
