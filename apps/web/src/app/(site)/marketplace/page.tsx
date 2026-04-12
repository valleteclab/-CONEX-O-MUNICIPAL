import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam, type ApiListResponse } from "@/lib/api-server";
import type { DirectoryListingDto } from "@/types/directory";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace local",
};

function moneyLabel(value?: string | null) {
  if (!value) {
    return null;
  }
  const normalized = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return parsed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function MarketplacePage() {
  const data = await apiGet<ApiListResponse<DirectoryListingDto>>(
    `/api/v1/businesses?${tenantQueryParam()}&modo=loja&take=100`,
    { revalidate: 30 },
  );

  return (
    <>
      <PageIntro
        title="Marketplace local"
        description="Uma vitrine pública inicial para produtos e serviços das empresas do município, com foco em descoberta e contato."
      />

      {!data || data.items.length === 0 ? (
        <p className="text-sm text-marinha-500">
          Ainda não há lojas publicadas no marketplace. Monte seu catálogo em{" "}
          <Link href="/dashboard/meu-negocio" className="font-semibold text-municipal-700 hover:underline">
            presença digital
          </Link>
          .
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((listing) => (
            <Card key={listing.id} className="border border-marinha-900/8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="success">Loja local</Badge>
                {listing.category ? <Badge tone="neutral">{listing.category}</Badge> : null}
              </div>
              <h2 className="mt-3 font-serif text-xl text-marinha-900">{listing.tradeName}</h2>
              {listing.publicHeadline ? <p className="mt-2 text-sm font-medium text-marinha-700">{listing.publicHeadline}</p> : null}
              {listing.description ? <p className="mt-2 text-sm text-marinha-600">{listing.description}</p> : null}

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {listing.offerings.length > 0 ? (
                  listing.offerings.slice(0, 4).map((off) => (
                    <div key={`${listing.id}-${off.title}`} className="rounded-btn border border-marinha-900/10 bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-marinha-900">{off.title}</span>
                        {off.price ? <span className="text-xs text-marinha-500">{moneyLabel(off.price) ?? off.price}</span> : null}
                      </div>
                      {off.description ? <p className="mt-2 text-xs text-marinha-600">{off.description}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-marinha-500">Catálogo em construção. Clique para ver o perfil completo.</p>
                )}
              </div>

              <div className="mt-4">
                <Link href={`/diretorio/${listing.slug}`} className="text-sm font-semibold text-municipal-700 hover:underline">
                  Abrir vitrine completa →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
