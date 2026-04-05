import type { Metadata } from "next";
import Link from "next/link";
import { QuotationCreateForm } from "@/components/cotacoes/quotation-create-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { quotationStatusLabel } from "@/lib/quotation-labels";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { QuotationRequestDto } from "@/types/quotations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Central de cotações",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default async function CotacoesPage() {
  const data = await apiGet<ApiListResponse<QuotationRequestDto>>(
    `/api/v1/quotations?${tenantQueryParam()}&take=50`,
    { revalidate: 15 },
  );

  return (
    <>
      <PageIntro
        title="Central de cotações"
        description="Publique o que precisa comprar ou contratar e receba propostas de fornecedores do município. Dados em tempo real a partir da API."
      />
      <p className="-mt-2 mb-6 text-sm text-marinha-600">
        <Link
          href="/dashboard/cotacoes"
          className="font-medium text-municipal-700 underline-offset-2 hover:underline"
        >
          Área logada: minhas solicitações
        </Link>
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-serif text-lg text-marinha-900">Nova solicitação</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Requer conta na plataforma. A solicitação fica visível para fornecedores conforme regras do tenant.
          </p>
          <div className="mt-4">
            <QuotationCreateForm />
          </div>
        </Card>
        <Card>
          <h2 className="font-serif text-lg text-marinha-900">Solicitações abertas</h2>
          {!data ? (
            <p className="mt-3 text-sm text-marinha-500">Não foi possível carregar a lista (verifique a API).</p>
          ) : data.items.length === 0 ? (
            <p className="mt-3 text-sm text-marinha-500">Nenhuma solicitação aberta no momento.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.items.map((q) => (
                <li
                  key={q.id}
                  className="rounded-btn border border-marinha-900/10 bg-surface px-3 py-2 text-sm"
                >
                  <p className="font-semibold text-marinha-900">{q.title}</p>
                  {q.description ? (
                    <p className="mt-1 line-clamp-2 text-marinha-600">{q.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-marinha-500">
                    {formatDate(q.createdAt)} · {quotationStatusLabel(q.status)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
