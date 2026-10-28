export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OFFLINE = "Sin conexión con el servidor";
const MISCONFIGURED = "La app no encuentra la API. Revisa VITE_API_URL en Vercel";
// Render apaga el servidor gratuito si no se usa; el primer pedido puede tardar en despertarlo.
const RETRY_DELAYS = [2500, 6000];

export function apiUrl(path: string) {
  const base = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const retries = (options.method ?? "GET").toUpperCase() === "GET" ? RETRY_DELAYS : [];

  const response = await send(() => fetch(apiUrl(path), { ...options, headers }), retries);
  if (!response.ok) {
    throw new ApiError(response.status, await readError(response, "No se pudo completar la acción"));
  }
  if (response.status === 204) return undefined as T;
  return readJson<T>(response);
}

export async function apiUpload<T>(
  path: string,
  file: File,
  token?: string | null,
  fields?: Record<string, string>,
  failure = "No se pudo analizar la foto",
): Promise<T> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const body = new FormData();
  if (fields) {
    for (const [key, value] of Object.entries(fields)) body.append(key, value);
  }
  body.append("file", file, file.name || "foto.jpg");

  const response = await send(() => fetch(apiUrl(path), { method: "POST", headers, body }), []);
  if (!response.ok) throw new ApiError(response.status, await readError(response, failure));
  return readJson<T>(response);
}

async function send(run: () => Promise<Response>, retries: number[]): Promise<Response> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch {
      if (attempt >= retries.length) throw new ApiError(0, OFFLINE);
      await wait(retries[attempt]);
    }
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(0, MISCONFIGURED);
  return response.json() as Promise<T>;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    return readDetail(await response.json(), fallback);
  } catch {
    return fallback;
  }
}

function readDetail(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object" || !("detail" in body)) return fallback;
  const detail = (body as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (item && typeof item === "object" && "msg" in item) return String((item as { msg: unknown }).msg);
        return String(item);
      })
      .join(". ");
  }
  return fallback;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
