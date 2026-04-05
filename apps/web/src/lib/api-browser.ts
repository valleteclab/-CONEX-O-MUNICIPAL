import { getPublicApiBaseUrl } from "./api-public";

function formatApiError(data: unknown, raw: string, statusText: string): string {
  if (data && typeof data === "object" && data !== null && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.map(String).join(", ");
    if (typeof m === "string") return m;
  }
  return raw || statusText;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const base = getPublicApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, error: "NEXT_PUBLIC_API_BASE_URL não definido" };
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const text = await res.text();
  let data: T | undefined;
  try {
    data = text ? (JSON.parse(text) as T) : undefined;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    const msg = formatApiError(data, text, res.statusText);
    return { ok: false, status: res.status, error: msg };
  }
  return { ok: true, status: res.status, data };
}
