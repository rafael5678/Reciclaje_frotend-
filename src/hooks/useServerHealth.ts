/** Periodic poll of /api/health. Skips fetches when the tab is hidden or offline. */
import { useEffect, useState } from "react";
import type { ServerHealth } from "../models/types";
import { CHECKING, healthService } from "../services/healthService";

const POLL_MS = 60_000;
let current: ServerHealth = CHECKING;
let timer = 0;
let inflight: Promise<void> | null = null;
let failStreak = 0;
const listeners = new Set<(health: ServerHealth) => void>();

function publish(next: ServerHealth) {
  current = next;
  listeners.forEach((listener) => listener(next));
}

function offlineHealth(): ServerHealth {
  return { ...CHECKING, state: "offline", error: "Sin conexión con el servidor" };
}

function refresh(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    publish(offlineHealth());
    return Promise.resolve();
  }
  if (typeof document !== "undefined" && document.hidden) return Promise.resolve();
  if (inflight) return inflight;
  inflight = healthService.get().then((next) => {
    failStreak = next.state === "online" ? 0 : failStreak + 1;
    inflight = null;
    publish(next);
  });
  return inflight;
}

function delay() {
  if (failStreak <= 0) return POLL_MS;
  return Math.min(120_000, POLL_MS * 2 ** Math.min(failStreak, 3));
}

function schedule() {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void refresh().finally(() => {
      if (listeners.size) schedule();
    });
  }, delay());
}

/** Force a health refresh. */
export function refreshServerHealth() {
  return refresh();
}

export function useServerHealth(): ServerHealth {
  const [health, setHealth] = useState(current);
  useEffect(() => {
    listeners.add(setHealth);
    if (current.state !== "online" || listeners.size === 1) void refresh();
    if (!timer) schedule();
    const onOffline = () => publish(offlineHealth());
    const onOnline = () => {
      failStreak = 0;
      void refresh();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      listeners.delete(setHealth);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      if (listeners.size === 0) {
        window.clearTimeout(timer);
        timer = 0;
      }
    };
  }, []);
  return health;
}
