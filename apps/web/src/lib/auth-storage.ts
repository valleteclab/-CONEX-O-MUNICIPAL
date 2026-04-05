const ACCESS = "cm_access_token";
const REFRESH = "cm_refresh_token";
const TENANT = "cm_tenant_id";
const BUSINESS = "cm_business_id";
export const BUSINESS_CHANGED_EVENT = "cm:business-changed";

function emitBusinessChanged(id: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(BUSINESS_CHANGED_EVENT, {
      detail: { businessId: id },
    }),
  );
}

function setSessionCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function clearSessionCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

/** Alinhado ao middleware (rotas /admin), que só vê cookies — não só localStorage. */
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function setTokens(access: string, refresh: string, tenantId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
  setSessionCookie(ACCESS, access, COOKIE_MAX_AGE_SEC);
  if (tenantId) {
    localStorage.setItem(TENANT, tenantId);
    setSessionCookie(TENANT, tenantId, COOKIE_MAX_AGE_SEC);
  }
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH);
}

export function getTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TENANT);
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(TENANT);
  localStorage.removeItem(BUSINESS);
  clearSessionCookie(ACCESS);
  clearSessionCookie(TENANT);
  emitBusinessChanged(null);
}

export function setBusinessId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BUSINESS, id);
  emitBusinessChanged(id);
}

export function getBusinessId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BUSINESS);
}

export function clearBusinessId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BUSINESS);
  emitBusinessChanged(null);
}
