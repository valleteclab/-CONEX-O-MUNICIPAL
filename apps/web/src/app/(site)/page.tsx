import Link from "next/link";
import { BackendStatus } from "@/components/site/backend-status";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { buildEntrarHref } from "@/lib/auth-routes";

const pillars = [
  {
    title: "Descoberta publica e geracao de negocios",
    description:
      "Diretorio, vitrine comercial, oportunidades e conteudo para aproximar empresas locais, compradores e a comunidade.",
    points: ["Diretorio com perfis publicos", "Oportunidades para captar demanda", "Marketplace como vitrine inicial"],
  },
  {
    title: "Operacao privada do negocio",
    description:
      "ERP, rotina fiscal e gestao operacional para empresas que ja estao em fase de cadastro, liberacao ou operacao.",
    points: ["Acesso empresarial com jornada guiada", "ERP para estoque, vendas e financeiro", "Fluxo separado para equipe interna"],
  },
];

const editorialCards = [
  {
    title: "Negocios locais",
    description:
      "Encontre empresas do municipio, conheca perfis publicos, servicos e canais de contato em um ambiente curado.",
    href: "/diretorio",
    cta: "Explorar diretorio",
  },
  {
    title: "Oportunidades",
    description:
      "Publique demandas, acompanhe respostas e conecte fornecedores a oportunidades privadas e publicas.",
    href: "/oportunidades",
    cta: "Ver oportunidades",
  },
  {
    title: "Academia",
    description:
      "Capacitacao para empreendedores, equipes e participantes do ecossistema local com trilhas mais praticas.",
    href: "/academia",
    cta: "Acessar academia",
  },
  {
    title: "Gestao para empresas",
    description:
      "Uma entrada clara para cadastro, liberacao e operacao do ERP sem misturar descoberta publica com rotina interna.",
    href: "/area-da-empresa",
    cta: "Conhecer a area da empresa",
  },
];

const trustSignals = [
  "Cadastro empresarial com revisao e liberacao orientada pelo municipio.",
  "Contexto multitenant para manter separacao por municipio e por negocio.",
  "Mesmo ecossistema para descoberta publica e operacao privada, sem jornadas soltas.",
];

export default function HomePage() {
  const showDevExtras = process.env.NODE_ENV !== "production";

  return (
    <div className="space-y-10 sm:space-y-14">
      <section className="overflow-hidden rounded-[28px] border border-marinha-900/8 bg-[linear-gradient(135deg,_rgba(0,162,141,0.12),_rgba(255,255,255,0.95)_48%,_rgba(245,158,11,0.12))] px-6 py-10 shadow-card sm:px-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr,0.7fr] lg:items-end">
          <div className="max-w-3xl">
            <Badge tone="accent" className="mb-4">
              Plataforma municipal de negocios e operacao
            </Badge>
            <h1 className="text-balance font-serif text-4xl font-bold tracking-tight text-marinha-900 sm:text-5xl lg:text-6xl">
              Um portal para descobrir oportunidades e uma area privada para fazer o negocio operar.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-marinha-500 sm:text-xl">
              O Conexao Municipal organiza a experiencia em dois caminhos claros: publico para descoberta e confianca;
              privado para cadastro, ERP e gestao interna.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/cadastro"
                className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-btn bg-municipal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
              >
                Criar conta
              </Link>
              <Link
                href={buildEntrarHref("portal")}
                className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-btn border-2 border-marinha-900/15 bg-white px-5 py-3 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
              >
                Entrar
              </Link>
              <Link
                href="/diretorio"
                className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-btn px-5 py-3 text-sm font-semibold text-municipal-800 transition hover:bg-municipal-600/10"
              >
                Explorar negocios
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            <Card className="border-white/60 bg-white/85 p-5 backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">Leitura do produto</p>
              <p className="mt-3 text-base leading-relaxed text-marinha-600">
                O site deixa de parecer um mosaico de modulos e passa a mostrar o que e publico, o que exige acesso e
                para quem cada caminho foi pensado.
              </p>
            </Card>
            <Card className="border-white/60 bg-marinha-900 p-5 text-white shadow-card-hover">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-600">Marketplace</p>
              <p className="mt-3 text-base leading-relaxed text-white/80">
                Continua publico, mas como parte da descoberta comercial, e nao como entrada concorrendo com login,
                ERP e administracao.
              </p>
              <Link href="/marketplace" className="mt-4 inline-flex text-sm font-semibold text-cerrado-500 hover:underline">
                Ver vitrine local
              </Link>
            </Card>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="h-full rounded-[24px] p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">Como funciona</p>
            <h2 className="mt-3 text-2xl text-marinha-900">{pillar.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-marinha-600">{pillar.description}</p>
            <ul className="mt-5 space-y-3 text-sm text-marinha-600">
              {pillar.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-municipal-600" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>

      <section>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">Entradas principais</p>
            <h2 className="mt-2 text-3xl text-marinha-900">Quatro portas, cada uma com uma funcao clara</h2>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-marinha-500">
            Em vez de abrir tudo ao mesmo tempo, a landing aponta para caminhos objetivos de descoberta, capacitacao e
            operacao.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {editorialCards.map((card, index) => (
            <Link key={card.title} href={card.href} className="group block focus-ring rounded-[24px]">
              <Card
                className={`h-full rounded-[24px] border-marinha-900/8 p-6 transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-card-hover ${
                  index === 3 ? "bg-[linear-gradient(180deg,_rgba(0,162,141,0.08),_#ffffff)]" : ""
                }`}
              >
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">Editorial</p>
                <h3 className="mt-3 text-2xl text-marinha-900">{card.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-marinha-600">{card.description}</p>
                <p className="mt-6 text-sm font-semibold text-municipal-800">{card.cta} -&gt;</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[24px] border border-marinha-900/8 bg-marinha-900 px-6 py-8 text-white shadow-card sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.8fr,1.2fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-600">Confianca</p>
            <h2 className="mt-3 text-3xl text-white">Uma experiencia mais coerente para municipio, negocios e equipe interna.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {trustSignals.map((signal) => (
              <div key={signal} className="rounded-[20px] border border-white/10 bg-white/5 p-5">
                <p className="text-sm leading-relaxed text-white/80">{signal}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-municipal-600/20 bg-white px-6 py-8 shadow-card sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr,auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">Proximo passo</p>
            <h2 className="mt-2 text-3xl text-marinha-900">Escolha um caminho claro e continue sem ruido.</h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-marinha-600">
              Quem esta conhecendo o ecossistema pode explorar os negocios e oportunidades. Quem vai operar o negocio
              ou entrar na equipe interna encontra um acesso dedicado.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Link
              href="/cadastro"
              className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-btn bg-municipal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
            >
              Criar conta
            </Link>
            <Link
              href={buildEntrarHref("portal")}
              className="focus-ring inline-flex min-h-[48px] items-center justify-center rounded-btn border-2 border-marinha-900/15 bg-white px-5 py-3 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface"
            >
              Ir para o acesso
            </Link>
          </div>
        </div>
      </section>

      {showDevExtras ? (
        <Card variant="featured" className="space-y-3 rounded-[24px]">
          <BackendStatus />
          <p className="text-sm text-marinha-500">
            <strong className="text-marinha-900">Ambiente de desenvolvimento:</strong>{" "}
            <Link href="/design-system" className="font-semibold text-municipal-700 underline-offset-2 hover:underline">
              Guia visual
            </Link>
          </p>
        </Card>
      ) : null}
    </div>
  );
}
