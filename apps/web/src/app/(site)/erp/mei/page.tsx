import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Central MEI",
};

const officialLinks = [
  {
    href: "https://www.gov.br/pt-br/servicos/emitir-das-para-pagamento-de-tributos-do-mei",
    title: "Emitir DAS",
    desc: "Acesse o canal oficial para gerar a guia mensal do MEI pelo PGMEI.",
    badge: "Mensal",
  },
  {
    href: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/pagamento-de-contribuicao-mensal/como-pagar-o-das",
    title: "Como pagar o DAS",
    desc: "Veja as formas oficiais de pagamento e orientações para manter o MEI em dia.",
    badge: "Guia",
  },
  {
    href: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/declaracao-anual-de-faturamento",
    title: "Declaração anual DASN-SIMEI",
    desc: "Abra o fluxo oficial da declaração anual obrigatória do MEI.",
    badge: "Anual",
  },
  {
    href: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/servicos-para-mei/parcelamento-de-divida-do-mei",
    title: "Parcelamento",
    desc: "Consulte a opção oficial para parcelar débitos do MEI quando houver atraso.",
    badge: "Regularização",
  },
];

const reminders = [
  {
    title: "Todo mês",
    headline: "DAS com vencimento no dia 20",
    desc: "Revise a guia com antecedência, gere o boleto no portal oficial e guarde o comprovante.",
  },
  {
    title: "Ao longo do ano",
    headline: "Organize faturamento e comprovantes",
    desc: "Mantenha notas, extratos e comprovantes de DAS em ordem para facilitar a declaração anual e manter a empresa regular.",
  },
  {
    title: "Todo ano",
    headline: "DASN-SIMEI ate 31 de maio",
    desc: "Declare o faturamento do ano anterior no prazo para evitar multa e pendências futuras.",
  },
];

const antiFraudTips = [
  "Use apenas links com domínio oficial gov.br ou receita.fazenda.gov.br para emitir o DAS.",
  "Desconfie de boletos enviados por WhatsApp, e-mail ou links patrocinados fora do portal oficial.",
  "Se houver dúvida, confira a guia novamente no PGMEI antes de pagar.",
];

const nextPhase = [
  "Histórico interno de DAS emitido, pago e comprovado por competência.",
  "Alertas automáticos de vencimento para MEIs cadastrados.",
  "Fluxo guiado para busca e conciliação do DAS dentro do sistema.",
];

function ExternalAction({
  href,
  title,
  desc,
  badge,
}: {
  href: string;
  title: string;
  desc: string;
  badge: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block focus-ring rounded-card"
    >
      <Card className="h-full border border-marinha-900/8 bg-white transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card-hover">
        <Badge tone="accent">{badge}</Badge>
        <h2 className="mt-3 font-serif text-xl text-marinha-900 group-hover:text-municipal-800">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-marinha-500">{desc}</p>
        <p className="mt-5 text-sm font-semibold text-municipal-700">
          Abrir canal oficial →
        </p>
      </Card>
    </a>
  );
}

export default function ErpMeiPage() {
  return (
    <>
      <PageIntro
        title="Central MEI"
        description="Um ponto único para a rotina do MEI: DAS mensal, declaração anual, parcelamento e orientações oficiais."
        badge="MEI"
      >
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="https://www.gov.br/pt-br/servicos/emitir-das-para-pagamento-de-tributos-do-mei"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="primary">Emitir DAS oficial</Button>
          </a>
          <a
            href="https://play.google.com/store/apps/details?id=br.gov.fazenda.receita.mei"
            target="_blank"
            rel="noreferrer"
          >
            <Button variant="secondary">App MEI</Button>
          </a>
        </div>
      </PageIntro>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.4fr,0.9fr]">
        <Card variant="featured">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
                Rotina recomendada
              </p>
              <h2 className="mt-2 font-serif text-2xl text-marinha-900">
                Operação simples, oficial e segura
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-marinha-600">
                Esta central organiza o que o MEI precisa fazer com frequência sem
                substituir o portal oficial. A ideia é reduzir o esforço do dia a dia
                e deixar você sempre a um clique do canal correto.
              </p>
            </div>
            <Badge tone="accent">Canal oficial primeiro</Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {reminders.map((item) => (
              <div
                key={item.title}
                className="rounded-btn border border-marinha-900/10 bg-white px-4 py-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
                  {item.title}
                </p>
                <h3 className="mt-2 font-serif text-lg text-marinha-900">
                  {item.headline}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-marinha-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border border-marinha-900/8">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
            Cuidados
          </p>
          <h2 className="mt-2 font-serif text-xl text-marinha-900">
            Proteção contra fraude
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-marinha-500">
            O DAS deve ser emitido em canal oficial. Use esta central como guia e
            confirme sempre os dados antes de pagar.
          </p>
          <ul className="mt-5 space-y-3">
            {antiFraudTips.map((tip) => (
              <li
                key={tip}
                className="rounded-btn border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {tip}
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <a
              href="https://www.gov.br/empresas-e-negocios/pt-br/empreendedor/orietacoes-sobre-fraude"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-municipal-700 underline"
            >
              Ler orientações oficiais sobre fraude
            </a>
          </div>
        </Card>
      </div>

      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
              Atalhos oficiais
            </p>
            <h2 className="mt-1 font-serif text-2xl text-marinha-900">
              O que o MEI mais usa no dia a dia
            </h2>
          </div>
          <Badge tone="neutral">Links oficiais</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {officialLinks.map((item) => (
            <ExternalAction key={item.href} {...item} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr,1.1fr]">
        <Card className="border border-marinha-900/8">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
            Organize no ERP
          </p>
          <h2 className="mt-2 font-serif text-xl text-marinha-900">
            Checklist sugerido por cliente MEI
          </h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">
                1. Confirmar CNPJ e dados básicos
              </p>
              <p className="mt-1 text-sm text-marinha-500">
                Garanta que o cadastro do negócio esteja consistente antes da rotina mensal.
              </p>
            </div>
            <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">
                2. Emitir DAS no canal oficial
              </p>
              <p className="mt-1 text-sm text-marinha-500">
                Gere a guia, baixe o comprovante e mantenha registro do período.
              </p>
            </div>
            <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">
                3. Guardar comprovante
              </p>
              <p className="mt-1 text-sm text-marinha-500">
                Mantenha o PDF ou o comprovante do pagamento para consulta futura.
              </p>
            </div>
            <div className="rounded-btn border border-marinha-900/10 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-marinha-900">
                4. Revisar declaração anual
              </p>
              <p className="mt-1 text-sm text-marinha-500">
                Consolide faturamento e tributos pagos para facilitar a DASN-SIMEI.
              </p>
            </div>
          </div>
        </Card>

        <Card className="border border-marinha-900/8 bg-gradient-to-br from-white via-surface-card to-cerrado-100/35">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">
                Próximos passos
              </p>
              <h2 className="mt-2 font-serif text-xl text-marinha-900">
                Evolução planejada da Central MEI
              </h2>
            </div>
            <Badge tone="accent">Planejamento</Badge>
          </div>
          <div className="mt-5 space-y-3">
            {nextPhase.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-btn border border-marinha-900/10 bg-white/80 px-4 py-3 backdrop-blur"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-municipal-600/15 text-sm font-bold text-municipal-800">
                  {index + 1}
                </div>
                <p className="text-sm leading-relaxed text-marinha-600">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-btn border border-municipal-600/20 bg-municipal-600/5 px-4 py-4">
            <p className="text-sm font-semibold text-marinha-900">
              Esta central foi pensada para facilitar a rotina do MEI sem tirar você do canal oficial.
            </p>
            <p className="mt-2 text-sm text-marinha-500">
              Aos poucos, novas facilidades podem ser adicionadas para acompanhar status e guardar comprovantes no mesmo lugar.
            </p>
            <div className="mt-4">
              <Link href="/erp" className="text-sm font-semibold text-municipal-700 underline">
                Voltar ao painel do ERP
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
