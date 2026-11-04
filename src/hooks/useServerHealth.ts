import { useEffect, useState } from "react";
import type { ServerHealth } from "../models/types";
import { CHECKING, healthService } from "../services/healthService";

const POLL_MS = 60_000;
let current: ServerHealth = CHECKING;
let timer = 0;
let inflight: Promise<void> | null = null;
const listeners = new Set<(health: ServerHealth) => void>();

function refresh(): Promise<void> {
  if (inflight) return inflight;
  inflight = healthService.get().then((next) => {
    current = next;
    inflight = null;
    listeners.forEach((listener) => listener(next));
  });
  return inflight;
}

export function refreshServerHealth() {
  return refresh();
}

export function useServerHealth(): ServerHealth {
  const [health, setHealth] = useState(current);
  useEffect(() => {
    listeners.add(setHealth);
    if (current.state !== "online" || listeners.size === 1) void refresh();
    if (!timer) timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => {
      listeners.delete(setHealth);
      if (listeners.size === 0) {
        window.clearInterval(timer);
        timer = 0;
      }
    };
  }, []);
  return health;
}
