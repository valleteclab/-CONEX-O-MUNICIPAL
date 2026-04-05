const ACCESS = "cm_access_token";
const REFRESH = "cm_refresh_token";
const TENANT = "cm_tenant_id";

export function setTokens(access: string, refresh: string, tenantId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
  if (tenantId) {
    localStorage.setItem(TENANT, tenantId);
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
}
