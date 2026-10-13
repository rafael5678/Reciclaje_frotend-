export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function apiUrl(path: string) {
  const base = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${base}${path}`;
}

export async function api<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { ...options, headers });
  } catch {
    throw new ApiError(0, "Sin conexión con el servidor");
  }

  if (!response.ok) {
    let message = "No se pudo completar la acción";
    try {
      message = readDetail(await response.json());
    } catch {
      message = "No se pudo completar la acción";
    }
    throw new ApiError(response.status, message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function apiUpload<T>(path: string, file: File, token?: string | null): Promise<T> {
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const body = new FormData();
  body.append("file", file, file.name || "foto.jpg");

  let response: Response;
  try {
    response = await fetch(apiUrl(path), { method: "POST", headers, body });
  } catch {
    throw new ApiError(0, "Sin conexión con el servidor");
  }

  if (!response.ok) {
    let message = "No se pudo analizar la foto";
    try {
      message = readDetail(await response.json());
    } catch {
      message = "No se pudo analizar la foto";
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}

function readDetail(body: unknown): string {
  if (!body || typeof body !== "object" || !("detail" in body)) return "No se pudo completar la acción";
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
  return "No se pudo completar la acción";
}
