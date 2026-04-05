/** Slug do tenant municipal (alinhado a DEFAULT_TENANT_SLUG na API). */
export function getDefaultTenantSlug(): string {
  return (
    process.env.NEXT_PUBLIC_DEFAULT_TENANT_SLUG?.trim() || "luis-eduardo-magalhaes"
  );
}
