import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { buildEntrarHref } from "@/lib/auth-routes";

export const metadata: Metadata = {
  title: "Area da empresa - status do cadastro",
  description: "Orientacoes para acompanhar analise e ativacao do ERP empresarial.",
};

const statusCards = [
  {
    title: "Cadastro recebido",
    description: "A empresa enviou os dados principais e o responsavel ja pode acompanhar a situacao pela area da empresa.",
  },
  {
    title: "Em analise",
    description: "A equipe municipal confere os dados do negocio, inscricoes e readiness fiscal antes de liberar a operacao.",
  },
  {
    title: "ERP liberado",
    description: "Apos aprovacao, o responsavel acessa o ERP, seleciona a empresa e conclui a rotina operacional.",
  },
];

export default function AreaDaEmpresaStatusPage() {
  return (
    <>
      <PageIntro
        title="Status do cadastro empresarial"
        description="Use este guia para entender em que etapa sua empresa esta e o que fazer ate a liberacao final do ERP."
        badge="Area da empresa"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {statusCards.map((card) => (
          <Card key={card.title} className="p-5">
            <h2 className="font-serif text-lg text-marinha-900">{card.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-marinha-600">{card.description}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6 p-6">
        <h2 className="font-serif text-xl text-marinha-900">Proximas acoes</h2>
        <div className="mt-4 space-y-3 text-sm text-marinha-600">
          <p>
            Se a empresa ainda nao foi enviada para analise, inicie pelo{" "}
            <Link href="/area-da-empresa/cadastro" className="font-semibold text-municipal-700 hover:underline">
              cadastro empresarial
            </Link>
            .
          </p>
          <p>
            Se voce ja recebeu a aprovacao, faca login em{" "}
            <Link href={buildEntrarHref("empresa")} className="font-semibold text-municipal-700 hover:underline">
              entrar na area da empresa
            </Link>
            .
          </p>
          <p>Se houver pendencias fiscais, conclua os dados da empresa dentro do ERP apos a liberacao.</p>
        </div>
      </Card>
    </>
  );
}
