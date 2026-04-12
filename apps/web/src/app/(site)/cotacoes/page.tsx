import type { Metadata } from "next";
import Link from "next/link";
import { QuotationCreateForm } from "@/components/cotacoes/quotation-create-form";
import { QuotationResponseForm } from "@/components/cotacoes/quotation-response-form";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { quotationStatusLabel } from "@/lib/quotation-labels";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { QuotationRequestDto } from "@/types/quotations";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Oportunidades de negócio",
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

function kindLabel(kind: QuotationRequestDto["kind"]) {
  return kind === "public_procurement" ? "Compra pública" : "Mercado local";
}

export default async function CotacoesPage() {
  const data = await apiGet<ApiListResponse<QuotationRequestDto>>(
    `/api/v1/quotations?${tenantQueryParam()}&take=50`,
    { revalidate: 15 },
  );

  return (
    <>
      <PageIntro
        title="Oportunidades de negócio"
        description="Publique demandas, receba propostas de fornecedores locais e abra espaço para compras públicas municipais na mesma base."
      />
      <p className="-mt-2 mb-6 text-sm text-marinha-600">
        <Link href="/dashboard/cotacoes" className="font-medium text-municipal-700 underline-offset-2 hover:underline">
          Área logada: minhas oportunidades
        </Link>
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-serif text-lg text-marinha-900">Nova oportunidade</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Publique demandas de mercado local ou compras públicas. Se você já escolheu um negócio no ERP, ele será vinculado automaticamente.
          </p>
          <div className="mt-4">
            <QuotationCreateForm />
          </div>
        </Card>
        <Card>
          <h2 className="font-serif text-lg text-marinha-900">Oportunidades abertas</h2>
          {!data ? (
            <p className="mt-3 text-sm text-marinha-500">Não foi possível carregar a lista agora.</p>
          ) : data.items.length === 0 ? (
            <p className="mt-3 text-sm text-marinha-500">Nenhuma oportunidade aberta no momento.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {data.items.map((q) => (
                <li key={q.id} className="rounded-btn border border-marinha-900/10 bg-surface px-3 py-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{kindLabel(q.kind)}</Badge>
                    {q.category ? <Badge tone="accent">{q.category}</Badge> : null}
                    <span className="text-xs text-marinha-500">{quotationStatusLabel(q.status)}</span>
                  </div>
                  <p className="mt-2 font-semibold text-marinha-900">{q.title}</p>
                  {q.description ? <p className="mt-1 line-clamp-2 text-marinha-600">{q.description}</p> : null}
                  <p className="mt-2 text-xs text-marinha-500">
                    {formatDate(q.createdAt)}
                    {q.desiredDate ? ` · desejado para ${new Date(q.desiredDate).toLocaleDateString("pt-BR")}` : ""}
                    {` · ${q.responsesCount} respostas`}
                  </p>
                  <QuotationResponseForm quotationId={q.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
