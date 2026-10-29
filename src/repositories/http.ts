export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const OFFLINE = "Sin conexión con el servidor";
const MISCONFIGURED = "La URL de la API no apunta a EcoScan. Pégala en Configuración o en VITE_API_URL de Vercel.";
const STORAGE_KEY = "ecoscan.apiUrl";
const GET_RETRIES = [2500, 8000];
const REQUEST_MS = 90_000;

export function getApiBase() {
  const override = (typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : "") || "";
  const env = String(import.meta.env.VITE_API_URL || "");
  return (override || env).trim().replace(/\/$/, "");
}

export function setApiBase(url: string) {
  const next = url.trim().replace(/\/$/, "");
  if (next) localStorage.setItem(STORAGE_KEY, next);
  else localStorage.removeItem(STORAGE_KEY);
}

export function apiUrl(path: string) {
  return `${getApiBase()}${path}`;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const method = (options.method ?? "GET").toUpperCase();
  const retries = method === "GET" ? GET_RETRIES : [];

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
      return await withTimeout(run());
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (attempt >= retries.length) {
        throw new ApiError(0, getApiBase() ? OFFLINE : MISCONFIGURED);
      }
      await wait(retries[attempt]);
    }
  }
}

function withTimeout(promise: Promise<Response>): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new ApiError(0, "El servidor tardó demasiado. Si está en Render, espera a que despierte e inténtalo otra vez.")), REQUEST_MS);
    promise.then(resolve, reject).finally(() => window.clearTimeout(timer));
  });
}

async function readJson<T>(response: Response): Promise<T> {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new ApiError(0, MISCONFIGURED);
  return response.json() as Promise<T>;
}

async function readError(response: Response, fallback: string): Promise<string> {
  if (response.status === 404) {
    const url = response.url || "";
    if (url.includes("/auth/guest")) {
      return "El modo invitado aún no está en el servidor público. Entra con tu cuenta (Iniciar sesión) o vuelve a desplegar Reciclaje_backend- en Render.";
    }
    if (url.includes("/classrooms")) {
      return "Los salones aún no están en el servidor público. En Render, abre tu API de EcoScan y pulsa Manual Deploy del último commit.";
    }
  }
  try {
    return readDetail(await response.json(), fallback);
  } catch {
    return response.status === 404 ? "El servidor no tiene esa función. Revisa la URL de Render o vuelve a desplegar el backend." : fallback;
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
