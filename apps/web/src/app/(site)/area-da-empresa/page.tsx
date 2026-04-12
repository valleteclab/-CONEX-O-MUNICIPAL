import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { buildEntrarHref } from "@/lib/auth-routes";

export const metadata: Metadata = {
  title: "Área da empresa — Conexão Municipal",
  description:
    "Central com as etapas para empresas localizadas no município aderirem ao ERP Conexão Municipal.",
};

const steps = [
  {
    title: "1. Prepare seu acesso",
    description:
      "Cadastre um responsável pelo ERP com e-mail, telefone e senha. Esse usuário acompanhará o processo de análise na plataforma.",
    action: {
      label: "Quero criar meu acesso",
      href: "/cadastro",
    },
  },
  {
    title: "2. Informe os dados da empresa",
    description:
      "Consulte o CNPJ, confirme endereço, CNAE, regime tributário e informe números de inscrição municipal e estadual.",
    action: {
      label: "Abrir formulário completo",
      href: "/area-da-empresa/cadastro",
    },
  },
  {
    title: "3. Aguarde a liberação",
    description:
      "A equipe da prefeitura valida o cadastro e ativa o ERP. Você recebe um aviso por e-mail quando a empresa estiver liberada.",
    action: {
      label: "Ver status do cadastro",
      href: "/area-da-empresa/status",
    },
  },
];

const highlights = [
  {
    title: "Integração fiscal completa",
    description:
      "Coletamos as informações necessárias para emissão de NFS-e e NF-e, ajudando sua empresa a começar com mais segurança.",
  },
  {
    title: "CNPJ com preenchimento automático",
    description:
      "Use a consulta oficial para trazer dados da Receita Federal, reduzir erros e acelerar a análise da prefeitura.",
  },
  {
    title: "Suporte municipal",
    description:
      "A equipe de atendimento acompanha sua empresa desde a solicitação até a operação diária no ERP Conexão Municipal.",
  },
];

export default function AreaDaEmpresaPage() {
  return (
    <>
      <PageIntro
        title="Gestão empresarial do município"
        description="Organize o cadastro, acompanhe a análise e prepare a sua empresa para operar no ERP municipal."
        badge="Área da empresa"
      />

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.95fr)]">
        <Card className="p-6">
          <h2 className="font-serif text-xl text-marinha-900">Como funciona</h2>
          <p className="mt-2 text-sm text-marinha-500">
            A operação do ERP é liberada após a revisão da prefeitura. Siga as etapas abaixo para avançar com mais
            clareza.
          </p>

          <ol className="mt-6 space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="rounded-card border border-marinha-900/8 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold uppercase tracking-wide text-municipal-700">
                      Etapa {index + 1}
                    </span>
                    <h3 className="mt-1 font-serif text-lg text-marinha-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-marinha-600">{step.description}</p>
                  </div>
                  <Link
                    href={step.action.href}
                    className="focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-btn border-2 border-marinha-500/25 bg-white px-4 py-2.5 text-sm font-semibold text-marinha-900 transition hover:border-municipal-600/40 hover:bg-surface md:w-auto md:whitespace-nowrap"
                  >
                    {step.action.label}
                  </Link>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-6 rounded-card border border-municipal-200 bg-municipal-50/70 p-4 text-sm text-municipal-900">
            <p className="font-semibold">Já possui cadastro e foi liberado?</p>
            <p className="mt-1">
              Acesse o ERP diretamente pela <Link href="/erp" className="underline">área da empresa</Link>. Se sua empresa
              ainda estiver em análise, mantenha os dados atualizados e aguarde o contato da prefeitura.
            </p>
          </div>
        </Card>

        <div className="space-y-4">
          {highlights.map((highlight) => (
            <Card key={highlight.title} className="p-5">
              <h3 className="font-serif text-lg text-marinha-900">{highlight.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-marinha-600">{highlight.description}</p>
            </Card>
          ))}
          <Card className="p-5">
            <h3 className="font-serif text-lg text-marinha-900">Acesso rápido</h3>
            <p className="mt-2 text-sm text-marinha-600">
              Se você já gerencia empresas aprovadas, utilize o acesso abaixo.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Link
                href={buildEntrarHref("empresa")}
                className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn bg-municipal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="focus-ring inline-flex min-h-[44px] items-center justify-center rounded-btn px-4 py-2.5 text-sm font-semibold text-municipal-700 transition hover:bg-municipal-600/10"
              >
                Criar conta
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
