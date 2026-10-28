import type { User } from "../models/types";
import { api } from "./http";

type ApiUser = { id: number; name: string; email: string; guest?: boolean };
type ApiToken = { token: string; user: ApiUser };

export const authRepository = {
  login(email: string, password: string) {
    return api<ApiToken>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  register(name: string, email: string, password: string) {
    return api<ApiToken>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  },
  guest() {
    return api<ApiToken>("/api/auth/guest", { method: "POST" });
  },
  async me(token: string): Promise<User> {
    return api<ApiUser>("/api/auth/me", {}, token);
  },
};
