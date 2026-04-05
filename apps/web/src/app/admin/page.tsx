"use client";

import { useCallback, useEffect, useState } from "react";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";
import Link from "next/link";

type Stats = {
  totalBusinesses: number;
  pendingDirectory: number;
  pendingErp: number;
  totalQuotations: number;
  totalCourses: number;
  totalUsers: number;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);

    const [dirRes, erpRes] = await Promise.all([
      apiAuthFetch<{ items: unknown[]; total: number }>("/api/v1/platform/directory/listings?take=1&skip=0"),
      apiAuthFetch<{ items: unknown[]; total: number }>("/api/v1/platform/erp/businesses?take=1&skip=0"),
    ]);

    setLoading(false);

    if (!dirRes.ok || !erpRes.ok) {
      setErr("Sem permissão para acessar o painel administrativo.");
      return;
    }

    setStats({
      totalBusinesses: 0,
      pendingDirectory: dirRes.data?.total ?? 0,
      pendingErp: erpRes.data?.total ?? 0,
      totalQuotations: 0,
      totalCourses: 0,
      totalUsers: 0,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-gray-500">Carregando...</p>;
  }

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {err}
      </div>
    );
  }

  const cards = [
    {
      label: "Vitrines pendentes",
      value: stats?.pendingDirectory ?? 0,
      href: "/admin/diretorio",
      color: "bg-amber-50 border-amber-200 text-amber-700",
    },
    {
      label: "Negócios ERP pendentes",
      value: stats?.pendingErp ?? 0,
      href: "/admin/erp",
      color: "bg-blue-50 border-blue-200 text-blue-700",
    },
    {
      label: "Cotações ativas",
      value: stats?.totalQuotations ?? 0,
      href: "/",
      color: "bg-green-50 border-green-200 text-green-700",
    },
    {
      label: "Cursos na Academia",
      value: stats?.totalCourses ?? 0,
      href: "/admin/academia",
      color: "bg-purple-50 border-purple-200 text-purple-700",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral da plataforma Conexão Municipal.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`rounded-lg border p-4 transition hover:shadow-md ${card.color}`}
          >
            <p className="text-sm font-medium opacity-80">{card.label}</p>
            <p className="mt-1 text-3xl font-bold">{card.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Acesso rápido</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link
            href="/admin/diretorio"
            className="rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 transition hover:border-municipal-600 hover:bg-municipal-600/5 hover:text-municipal-700"
          >
            Moderar Diretório
          </Link>
          <Link
            href="/admin/erp"
            className="rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 transition hover:border-municipal-600 hover:bg-municipal-600/5 hover:text-municipal-700"
          >
            Moderar Negócios ERP
          </Link>
          <Link
            href="/admin/academia"
            className="rounded-lg border border-gray-200 p-4 text-sm font-medium text-gray-700 transition hover:border-municipal-600 hover:bg-municipal-600/5 hover:text-municipal-700"
          >
            Gerenciar Academia
          </Link>
        </div>
      </div>
    </div>
  );
}
