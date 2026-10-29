import type { User } from "../models/types";
import { api } from "./http";

type ApiUser = { id: number; name: string; email: string; guest?: boolean };
type ApiToken = { token: string; user: ApiUser; moved_scans?: number };

export const authRepository = {
  login(email: string, password: string, guestToken?: string | null) {
    return api<ApiToken>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }, guestToken);
  },
  register(name: string, email: string, password: string, guestToken?: string | null) {
    return api<ApiToken>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }, guestToken);
  },
  guest() {
    return api<ApiToken>("/api/auth/guest", { method: "POST" });
  },
  async me(token: string): Promise<User> {
    return api<ApiUser>("/api/auth/me", {}, token);
  },
};
