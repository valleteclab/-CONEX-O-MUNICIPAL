import { getPublicApiBaseUrl } from "./api-public";
import { getDefaultTenantSlug } from "./env-public";

export type ApiListResponse<T> = { items: T[]; total: number };

export async function apiGet<T>(
  path: string,
  options?: RequestInit & { revalidate?: number | false },
): Promise<T | null> {
  const base = getPublicApiBaseUrl();
  if (!base) {
    return null;
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const { revalidate, ...init } = options ?? {};
  const fetchInit: RequestInit =
    revalidate === false
      ? { ...init, cache: "no-store" }
      : { ...init, next: { revalidate: revalidate ?? 30 } };

  const res = await fetch(url, fetchInit);
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    // Não lançar no SSG/build: tenant inexistente (400), indisponibilidade, etc.
    console.error(`[apiGet] ${res.status} ${url}`);
    return null;
  }
  return res.json() as Promise<T>;
}

/** Query tenant padrão do portal (município). */
export function tenantQueryParam(): string {
  const slug = getDefaultTenantSlug();
  return `tenant=${encodeURIComponent(slug)}`;
}
