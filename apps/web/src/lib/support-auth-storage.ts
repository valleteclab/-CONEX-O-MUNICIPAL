const SUPPORT_ACCESS = "cm_support_token";
const SUPPORT_COOKIE_MAX_AGE_SEC = 60 * 60 * 8;

function setSessionCookie(name: string, value: string, maxAgeSec: number): void {
  if (typeof document === "undefined") return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSec}; SameSite=Lax${secure}`;
}

function clearSessionCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function setSupportToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SUPPORT_ACCESS, token);
  setSessionCookie(SUPPORT_ACCESS, token, SUPPORT_COOKIE_MAX_AGE_SEC);
}

export function getSupportToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SUPPORT_ACCESS);
}

export function clearSupportToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SUPPORT_ACCESS);
  clearSessionCookie(SUPPORT_ACCESS);
}
