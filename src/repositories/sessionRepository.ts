import type { Session } from "../models/types";

class SessionRepository {
  private readonly key = "ecoscan.session";

  load(): Session | null {
    try {
      const raw = localStorage.getItem(this.key);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }

  save(session: Session) {
    localStorage.setItem(this.key, JSON.stringify(session));
  }

  clear() {
    localStorage.removeItem(this.key);
  }

  token(): string | null {
    return this.load()?.token ?? null;
  }
}

export const sessionRepository = new SessionRepository();
