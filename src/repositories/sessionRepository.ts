import type { Session } from "../models/types";

const KEY = "ecoscan.session";

export const sessionRepository = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  save(session: Session) {
    localStorage.setItem(KEY, JSON.stringify(session));
  },
  clear() {
    localStorage.removeItem(KEY);
  },
  token(): string | null {
    return this.load()?.token ?? null;
  },
};
