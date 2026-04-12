import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam } from "@/lib/api-server";
import type { DirectoryListingDto } from "@/types/directory";

type Props = { params: { slug: string } };

export const dynamic = "force-dynamic";

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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const row = await apiGet<DirectoryListingDto>(
    `/api/v1/businesses/${encodeURIComponent(params.slug)}?${tenantQueryParam()}`,
    { revalidate: 60 },
  );
  const suffix = row?.modo === "loja" ? " — Marketplace local" : " — Perfil comercial";
  return {
    title: row ? `${row.tradeName}${suffix}` : "Negócio",
  };
}

export default async function DiretorioNegocioPage({ params }: Props) {
  const data = await apiGet<DirectoryListingDto>(
    `/api/v1/businesses/${encodeURIComponent(params.slug)}?${tenantQueryParam()}`,
    { revalidate: 30 },
  );

  if (!data) {
    notFound();
  }

  const isLoja = data.modo === "loja";
  const contacts = Object.entries(data.contactInfo ?? {}).filter(([, value]) => Boolean(value));

  return (
    <>
      <PageIntro
        title={data.tradeName}
        description={data.publicHeadline || data.description || "Sem descrição cadastrada."}
        badge={isLoja ? "Marketplace local" : "Perfil comercial"}
      >
        <div className="mt-3 flex flex-wrap gap-2">
          {data.category ? <Badge tone="neutral">{data.category}</Badge> : null}
          <Badge tone="success">Luís Eduardo Magalhães · BA</Badge>
        </div>
      </PageIntro>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="font-serif text-lg font-bold text-marinha-900">
            {isLoja ? "Sobre a loja" : "Sobre o negócio"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-marinha-600">
            {data.description || "Negócio sem descrição detalhada no momento."}
          </p>
          {data.services.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-marinha-500">Serviços oferecidos</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.services.map((service) => (
                  <Badge key={service} tone="accent">
                    {service}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="font-serif text-lg font-bold text-marinha-900">Contatos</h2>
          {contacts.length === 0 ? (
            <p className="mt-2 text-sm text-marinha-500">O negócio ainda não publicou canais de contato.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm text-marinha-700">
              {contacts.map(([key, value]) => (
                <li key={key}>
                  <span className="font-semibold capitalize">{key}:</span> {String(value)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.offerings.length > 0 ? (
        <Card className="mb-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-marinha-900">
                {isLoja ? "Catálogo inicial" : "Ofertas e serviços em destaque"}
              </h2>
              <p className="mt-1 text-sm text-marinha-500">
                Itens publicados pelo negócio para facilitar descoberta e contato.
              </p>
            </div>
            <Badge tone={isLoja ? "success" : "neutral"}>{data.offerings.length} itens</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {data.offerings.map((off) => (
              <div key={`${off.kind}-${off.title}`} className="rounded-btn border border-marinha-900/10 bg-surface p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={off.kind === "product" ? "success" : "accent"}>
                    {off.kind === "product" ? "Produto" : "Serviço"}
                  </Badge>
                  {off.price ? <span className="text-sm font-semibold text-marinha-900">{moneyLabel(off.price) ?? off.price}</span> : null}
                </div>
                <h3 className="mt-2 font-serif text-lg text-marinha-900">{off.title}</h3>
                {off.description ? <p className="mt-2 text-sm text-marinha-600">{off.description}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <p className="text-sm text-marinha-600">
          Precisa de proposta ou quer abrir concorrência? Use a{" "}
          <Link href="/oportunidades" className="font-semibold text-municipal-700 hover:underline">
            central de oportunidades
          </Link>{" "}
          para solicitar orçamento público ou privado e atrair fornecedores locais.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/oportunidades">
            <Button variant="primary">{isLoja ? "Pedir orçamento" : "Abrir oportunidade"}</Button>
          </Link>
          {isLoja ? (
            <Link
              href="/marketplace"
              className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
            >
              Ver mais lojas
            </Link>
          ) : null}
          <Link
            href="/diretorio"
            className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn border-2 border-marinha-900/25 bg-white px-4 py-2.5 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
          >
            Voltar ao diretório
          </Link>
        </div>
      </Card>
    </>
  );
}
