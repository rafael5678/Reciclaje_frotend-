/** Login, register, guest, and session restore. */
import type { Session, User } from "../models/types";
import { authRepository } from "../repositories/authRepository";
import { ApiError } from "../repositories/http";
import { sessionRepository } from "../repositories/sessionRepository";
import { credentials } from "./credentials";

export type AuthResult = { session: Session; moved: number };

class AuthService {
  async login(email: string, password: string): Promise<AuthResult> {
    const cleanEmail = credentials.sanitizeEmail(email);
    const cleanPassword = credentials.sanitizePassword(password);
    const emailError = credentials.emailError(cleanEmail);
    const passwordError = credentials.passwordError(cleanPassword);
    if (emailError) throw new Error(emailError);
    if (passwordError) throw new Error(passwordError);
    return this.keep(await authRepository.login(cleanEmail, cleanPassword, this.guestToken()));
  }

  async register(name: string, email: string, password: string): Promise<AuthResult> {
    const cleanName = credentials.finishName(name);
    const cleanEmail = credentials.sanitizeEmail(email);
    const cleanPassword = credentials.sanitizePassword(password);
    const nameError = credentials.nameError(cleanName);
    const emailError = credentials.emailError(cleanEmail);
    const passwordError = credentials.passwordError(cleanPassword);
    if (nameError) throw new Error(nameError);
    if (emailError) throw new Error(emailError);
    if (passwordError) throw new Error(passwordError);
    return this.keep(await authRepository.register(cleanName, cleanEmail, cleanPassword, this.guestToken()));
  }

  async guest(): Promise<AuthResult> {
    return this.keep(await authRepository.guest());
  }

  async restore(): Promise<Session | null> {
    const saved = sessionRepository.load();
    if (!saved) return null;
    try {
      const user = await authRepository.me(saved.token);
      return this.keep({ token: saved.token, user }).session;
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) return saved;
      sessionRepository.clear();
      return null;
    }
  }

  isGuest(): boolean {
    return Boolean(sessionRepository.load()?.user.guest);
  }

  logout() {
    sessionRepository.clear();
  }

  current(): Session | null {
    return sessionRepository.load();
  }

  private keep(raw: { token: string; user: User; moved_scans?: number }): AuthResult {
    const session = { token: raw.token, user: raw.user };
    sessionRepository.save(session);
    return { session, moved: raw.moved_scans ?? 0 };
  }

  private guestToken(): string | null {
    const current = sessionRepository.load();
    return current?.user.guest ? current.token : null;
  }
}

export const authService = new AuthService();
