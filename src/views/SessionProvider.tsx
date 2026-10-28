import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "../models/types";
import { authService } from "../services/authService";

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  revision: number;
  setSession: (session: Session | null) => void;
  logout: () => void;
  bump: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let alive = true;
    authService.restore().then((next) => {
      if (!alive) return;
      if (next) setSession(next);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      ready,
      revision,
      setSession,
      logout() {
        authService.logout();
        setSession(null);
      },
      bump() {
        setRevision((current) => current + 1);
      },
    }),
    [session, ready, revision],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Sesión no disponible");
  return value;
}
