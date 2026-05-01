import { getPublicApiBaseUrl } from "@/lib/api-public";

type HealthJson = { status?: string; service?: string; time?: string };

export async function BackendStatus() {
  const base = getPublicApiBaseUrl();
  if (!base) {
    return (
      <p className="text-sm text-marinha-500">
        <strong className="text-marinha-900">Conexão do sistema:</strong> ainda não configurada para este ambiente.
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
          <strong className="text-marinha-900">Conexão do sistema:</strong> recebemos uma resposta inesperada. Tente novamente em instantes.
        </p>
      );
    }
    return (
      <p className="text-sm text-sucesso-600">
        <strong className="text-marinha-900">Conexão do sistema:</strong>{" "}
        <span className="font-medium">{data.status}</span>
        {data.service ? (
          <>
            {" "}
            · <span>{data.service}</span>
          </>
        ) : null}
      </p>
    );
  } catch {
    return (
      <p className="text-sm text-alerta-500">
        <strong className="text-marinha-900">Conexão do sistema:</strong> não foi possível confirmar o funcionamento agora.
      </p>
    );
  }
}
