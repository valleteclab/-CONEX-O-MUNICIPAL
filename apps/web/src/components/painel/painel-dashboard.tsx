"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import type { AnalyticsDashboardDto } from "@/types/analytics";
import Link from "next/link";

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="space-y-2 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">{label}</p>
      <p className="font-serif text-2xl font-bold text-marinha-900">{value}</p>
      {hint ? <p className="text-xs text-marinha-500">{hint}</p> : null}
    </Card>
  );
}

export function PainelDashboard() {
  const [data, setData] = useState<AnalyticsDashboardDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setError(null);
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await apiAuthFetch<AnalyticsDashboardDto>("/api/v1/analytics/dashboard");
    setLoading(false);
    if (res.status === 401) {
      setError(
        "Sessão inválida ou expirada. Entre novamente. (Se vê «Unauthorized», é este caso.)",
      );
      setData(null);
      return;
    }
    if (res.status === 403) {
      setError(
        "Este painel mostra indicadores do município e é só para gestores locais (papéis manager ou admin). Se a sua função é super administrador da plataforma (moderação em vários municípios), use o botão «Área da plataforma» no topo do site.",
      );
      setData(null);
      return;
    }
    if (!res.ok || !res.data) {
      const raw = res.error || "";
      const friendly =
        /unauthorized/i.test(raw) ?
          "Sessão inválida ou expirada. Faça login novamente."
        : raw || "Não foi possível carregar o painel.";
      setError(friendly);
      setData(null);
      return;
    }
    setData(res.data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!getAccessToken()) {
    return (
      <p className="text-sm text-marinha-600">
        <Link href="/login" className="font-semibold text-municipal-700 hover:underline">
          Entre
        </Link>{" "}
        com uma conta de <strong>gestor</strong> ou <strong>administrador</strong> para ver os indicadores.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="h-28 animate-pulse bg-marinha-900/5">
            <span className="sr-only">A carregar…</span>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-btn border border-alerta-500/30 bg-alerta-500/10 px-3 py-3 text-sm text-alerta-800">
        <p>{error}</p>
        <p>
          <Link
            href="/plataforma/entrar"
            className="font-semibold text-municipal-800 underline hover:text-municipal-900"
          >
            Ir para Área da plataforma (super admin)
          </Link>
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const k = data.kpis;

  return (
    <div className="space-y-6">
      <p className="text-xs text-marinha-500">
        Atualizado em {new Date(data.generatedAt).toLocaleString("pt-BR")} · tenant{" "}
        <span className="font-mono text-[11px]">{data.tenantId.slice(0, 8)}…</span>
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Vitrines publicadas (diretório)" value={k.directoryListingsPublished} />
        <KpiCard label="Negócios ERP ativos" value={k.erpBusinessesActive} />
        <KpiCard
          label="Novos utilizadores MEI (mês)"
          value={k.newMeiUsersThisMonth}
          hint="Conta criada neste mês no tenant."
        />
        <KpiCard label="Cotações abertas" value={k.quotationsOpen} />
        <KpiCard label="Matrículas ativas (academia)" value={k.academyEnrollmentsActive} />
        <KpiCard
          label="Volume transacionado (propostas)"
          value={k.transactionVolumeSelected ?? "—"}
          hint="Modelo de propostas — em evolução (SDD)."
        />
      </div>
    </div>
  );
}
