import type { ServerHealth } from "../models/types";
import { api } from "../repositories/http";

type ApiHealth = {
  database: boolean;
  gemini: boolean;
  vision?: {
    models: { name: string; available: boolean; retry_at: number | null }[];
    per_minute: number;
    used_last_minute: number;
  };
};

export const CHECKING: ServerHealth = {
  state: "checking",
  database: false,
  gemini: false,
  models: [],
  perMinute: 0,
  usedLastMinute: 0,
};

export const healthService = {
  async get(): Promise<ServerHealth> {
    try {
      const raw = await api<ApiHealth>("/api/health");
      return {
        state: "online",
        database: raw.database,
        gemini: raw.gemini,
        models: (raw.vision?.models ?? []).map((model) => ({ name: model.name, available: model.available, retryAt: model.retry_at })),
        perMinute: raw.vision?.per_minute ?? 0,
        usedLastMinute: raw.vision?.used_last_minute ?? 0,
      };
    } catch (error) {
      return { ...CHECKING, state: "offline", error: error instanceof Error ? error.message : "Sin conexión con el servidor" };
    }
  },
};

export function modelLabel(name: string): string {
  return name
    .split("-")
    .filter((part) => part !== "preview")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
