import { getPublicApiBaseUrl } from "@/lib/api-public";

type HealthJson = { status?: string; service?: string; time?: string };

export async function BackendStatus() {
  const base = getPublicApiBaseUrl();
  if (!base) {
    return (
      <p className="text-sm text-marinha-500">
        <strong className="text-marinha-900">API:</strong> sem{" "}
        <code className="rounded bg-marinha-900/5 px-1 font-mono text-xs">
          NEXT_PUBLIC_API_BASE_URL
        </code>{" "}
        no build (Railway: variável no serviço do Next).
      </p>
    );
  }

  try {
    const res = await fetch(`${base}/api/v1/health`, {
      next: { revalidate: 30 },
    });
    const data: HealthJson | null = res.ok ? await res.json() : null;
    if (!res.ok || !data?.status) {
      return (
        <p className="text-sm text-alerta-500">
          <strong className="text-marinha-900">API:</strong> resposta inesperada (
          {res.status}) em <span className="font-mono text-xs">{base}</span>
        </p>
      );
    }
    return (
      <p className="text-sm text-sucesso-600">
        <strong className="text-marinha-900">API:</strong>{" "}
        <span className="font-medium">{data.status}</span>
        {data.service ? (
          <>
            {" "}
            · <span className="font-mono text-xs">{data.service}</span>
          </>
        ) : null}{" "}
        · <span className="font-mono text-xs">{base}</span>
      </p>
    );
  } catch {
    return (
      <p className="text-sm text-alerta-500">
        <strong className="text-marinha-900">API:</strong> não foi possível contactar{" "}
        <span className="font-mono text-xs">{base}</span> (rede ou CORS no browser para
        chamadas client-side).
      </p>
    );
  }
}
