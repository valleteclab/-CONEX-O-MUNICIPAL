import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Área da empresa — status do cadastro",
  description: "Orientações para acompanhar análise e ativação do ERP empresarial.",
};

const statusCards = [
  {
    title: "Cadastro recebido",
    description: "A empresa enviou os dados principais e o responsável já pode acompanhar a situação pela área da empresa.",
  },
  {
    title: "Em análise",
    description: "A equipe municipal confere os dados do negócio, inscrições e readiness fiscal antes de liberar a operação.",
  },
  {
    title: "ERP liberado",
    description: "Após aprovação, o responsável acessa o ERP, seleciona a empresa e conclui a rotina operacional.",
  },
];

export default function AreaDaEmpresaStatusPage() {
  return (
    <>
      <PageIntro
        title="Status do cadastro empresarial"
        description="Use este guia para entender em que etapa sua empresa está e o que fazer até a liberação final do ERP."
        badge="Área da empresa"
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
        <h2 className="font-serif text-xl text-marinha-900">Próximas ações</h2>
        <div className="mt-4 space-y-3 text-sm text-marinha-600">
          <p>
            Se a empresa ainda não foi enviada para análise, inicie pelo{" "}
            <Link href="/area-da-empresa/cadastro" className="font-semibold text-municipal-700 hover:underline">
              cadastro empresarial
            </Link>
            .
          </p>
          <p>
            Se você já recebeu a aprovação, faça login em{" "}
            <Link href="/area-da-empresa/entrar" className="font-semibold text-municipal-700 hover:underline">
              entrar na área da empresa
            </Link>
            .
          </p>
          <p>
            Se houver pendências fiscais, conclua os dados da empresa dentro do ERP após a liberação.
          </p>
        </div>
      </Card>
    </>
  );
}
