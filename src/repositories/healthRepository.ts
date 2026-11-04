import { api } from "./http";

export type ApiHealth = {
  service?: string;
  database: boolean;
  gemini: boolean;
  vision?: {
    models: { name: string; available: boolean; retry_at: number | null }[];
    per_minute: number;
    used_last_minute: number;
  };
};

export const healthRepository = {
  get() {
    return api<ApiHealth>("/api/health");
  },
};
