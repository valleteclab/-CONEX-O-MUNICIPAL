/**
 * Base URL pública da API Nest (sem barra final).
 * Produção: definir NEXT_PUBLIC_API_BASE_URL no Railway (serviço web), ex. https://api-production-488f.up.railway.app
 * Local: http://localhost:3001 (default em desenvolvimento se env não existir)
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (raw) return raw.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "development") return "http://localhost:3001";
  return "";
}

/** Monta URL absoluta para um path da API (ex. "/api/v1/health"). */
export function publicApiUrl(path: string): string {
  const base = getPublicApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}
