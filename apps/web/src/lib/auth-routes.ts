export type AuthIntent = "portal" | "empresa" | "platform";

export function parseAuthIntent(value?: string | null): AuthIntent {
  if (value === "empresa") {
    return "empresa";
  }

  if (value === "platform") {
    return "platform";
  }

  return "portal";
}

export function getAuthDestination(intent: AuthIntent): string {
  switch (intent) {
    case "empresa":
    case "portal":
      return "/erp";
    case "platform":
      return "/admin";
    default:
      return "/erp";
  }
}

export function buildEntrarHref(intent?: AuthIntent, redirectTo?: string | null): string {
  const params = new URLSearchParams();

  if (intent) {
    params.set("intent", intent);
  }

  if (redirectTo && redirectTo.startsWith("/")) {
    params.set("redirect", redirectTo);
  }

  const query = params.toString();
  return query ? `/entrar?${query}` : "/entrar";
}
