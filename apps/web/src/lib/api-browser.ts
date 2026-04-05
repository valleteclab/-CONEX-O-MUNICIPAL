import { getPublicApiBaseUrl } from "./api-public";
import { getAccessToken, getTenantId } from "./auth-storage";

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
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha de rede";
    return {
      ok: false,
      status: 0,
      error:
        msg === "Failed to fetch" ?
          "Não foi possível contactar a API (rede ou CORS). Verifique NEXT_PUBLIC_API_BASE_URL e CORS_ORIGINS no servidor."
        : msg,
    };
  }
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

export async function apiAuthFetch<T>(
  path: string,
  init?: RequestInit & { includeBusinessIdHeader?: boolean },
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const accessToken = getAccessToken();
  const tenantId = getTenantId();
  if (!accessToken) {
    return { ok: false, status: 401, error: "Sessão expirada. Faça login novamente." };
  }
  const { includeBusinessIdHeader, headers, ...rest } = init ?? {};
  return apiFetch<T>(path, {
    ...rest,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(tenantId && !includeBusinessIdHeader ? { "X-Tenant-Id": tenantId } : {}),
      ...headers,
    },
  });
}
