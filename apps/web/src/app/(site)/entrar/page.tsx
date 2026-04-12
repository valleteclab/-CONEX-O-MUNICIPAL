import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { AuthIntent } from "@/lib/auth-routes";
import { buildEntrarHref, getAuthDestination, parseAuthIntent } from "@/lib/auth-routes";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Escolha o tipo de acesso e entre no Conexão Municipal pelo caminho correto.",
  robots: { index: false, follow: false },
};

type EntrarPageProps = {
  searchParams?: {
    intent?: string;
    redirect?: string;
  };
};

const accessOptions: Array<{
  intent: AuthIntent;
  title: string;
  eyebrow: string;
  description: string;
  support: string;
}> = [
  {
    intent: "empresa",
    title: "Sou empresa e quero gerir meu negócio",
    eyebrow: "Área da empresa",
    description: "Para quem está em fase de cadastro, liberação ou operação do ERP municipal.",
    support: "Depois do login, o destino padrão é o ERP da empresa.",
  },
  {
    intent: "portal",
    title: "Sou usuário do portal",
    eyebrow: "Portal",
    description: "Para acompanhar presença digital, oportunidades, formações e fluxos autenticados do ecossistema.",
    support: "Depois do login, o destino padrão é o dashboard do portal.",
  },
  {
    intent: "platform",
    title: "Sou da equipe interna",
    eyebrow: "Equipe da plataforma",
    description: "Para moderação, aprovação de cadastros, operação interna e gestão global da plataforma.",
    support: "Depois do login, o destino padrão é o painel administrativo.",
  },
];

function AccessSummary({ intent }: { intent: AuthIntent }) {
  const selected = accessOptions.find((option) => option.intent === intent);

  if (!selected) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <Badge tone="accent">{selected.eyebrow}</Badge>
        <h1 className="mt-4 text-4xl text-marinha-900">Entrar com clareza, sem misturar caminhos.</h1>
        <p className="mt-4 text-base leading-relaxed text-marinha-600">{selected.description}</p>
      </div>

      <div className="rounded-[20px] border border-municipal-600/15 bg-municipal-600/5 p-4 text-sm text-marinha-600">
        <p className="font-semibold text-marinha-900">Destino padrão após o login</p>
        <p className="mt-2">
          {selected.support} <span className="font-medium text-municipal-800">{getAuthDestination(intent)}</span>
        </p>
      </div>
    </div>
  );
}

export default function EntrarPage({ searchParams }: EntrarPageProps) {
  const redirect = searchParams?.redirect && searchParams.redirect.startsWith("/") ? searchParams.redirect : null;
  const selectedIntent = searchParams?.intent ? parseAuthIntent(searchParams.intent) : null;

  return (
    <div className="grid w-full gap-8 lg:grid-cols-[0.95fr,1.05fr]">
      <div className="space-y-5">
        <div>
          <Badge tone="accent">Área de acesso</Badge>
          <h1 className="mt-4 text-4xl text-marinha-900 sm:text-5xl">Escolha o seu tipo de entrada.</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-marinha-600">
            O Conexão Municipal separa melhor o que é descoberta pública e o que é operação privada. Selecione abaixo
            o perfil que melhor representa o seu momento.
          </p>
          {redirect ? (
            <p className="mt-3 text-sm text-marinha-500">
              Você estava tentando acessar <span className="font-semibold text-marinha-900">{redirect}</span>. Vamos
              manter esse destino depois do login.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          {accessOptions.map((option) => {
            const active = selectedIntent === option.intent;

            return (
              <Link key={option.intent} href={buildEntrarHref(option.intent, redirect)} className="group block focus-ring rounded-[22px]">
                <Card
                  className={`rounded-[22px] border-2 p-6 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card-hover ${
                    active
                      ? "border-municipal-600 bg-[linear-gradient(180deg,_rgba(0,162,141,0.10),_#ffffff)]"
                      : "border-marinha-900/8 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">{option.eyebrow}</p>
                      <h2 className="mt-3 text-2xl text-marinha-900">{option.title}</h2>
                      <p className="mt-3 text-base leading-relaxed text-marinha-600">{option.description}</p>
                    </div>
                    <span
                      className={`mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                        active
                          ? "border-municipal-600 bg-municipal-600 text-white"
                          : "border-marinha-900/12 bg-surface text-marinha-500"
                      }`}
                    >
                      {active ? "OK" : "→"}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="rounded-[20px] border border-marinha-900/8 bg-white/80 p-5 text-sm leading-relaxed text-marinha-600 shadow-card">
          Não tem conta ainda?{" "}
          <Link href="/cadastro" className="font-semibold text-municipal-700 hover:underline">
            Criar conta
          </Link>{" "}
          para começar a sua jornada. Se você só quer explorar o ecossistema antes de entrar, visite o{" "}
          <Link href="/diretorio" className="font-semibold text-municipal-700 hover:underline">
            diretório
          </Link>{" "}
          ou a{" "}
          <Link href="/academia" className="font-semibold text-municipal-700 hover:underline">
            academia
          </Link>
          .
        </div>
      </div>

      <Card className="rounded-[28px] border border-marinha-900/10 bg-white/92 p-6 shadow-card sm:p-8">
        {selectedIntent ? (
          <div className="space-y-8">
            <AccessSummary intent={selectedIntent} />
            <LoginForm intent={selectedIntent} />
          </div>
        ) : (
          <div className="flex h-full min-h-[420px] flex-col justify-between rounded-[22px] border border-dashed border-marinha-900/12 bg-surface px-6 py-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-municipal-700">Passo 2</p>
              <h2 className="mt-4 text-3xl text-marinha-900">Escolha um perfil para continuar.</h2>
              <p className="mt-4 text-base leading-relaxed text-marinha-600">
                Assim que você selecionar uma das opções ao lado, mostraremos o formulário certo e o destino padrão
                depois do login.
              </p>
            </div>

            <div className="grid gap-3 text-sm text-marinha-600">
              <div className="rounded-[18px] border border-marinha-900/8 bg-white px-4 py-4">
                Área da empresa: operação do negócio e ERP.
              </div>
              <div className="rounded-[18px] border border-marinha-900/8 bg-white px-4 py-4">
                Portal: presença digital, oportunidades e trilhas autenticadas.
              </div>
              <div className="rounded-[18px] border border-marinha-900/8 bg-white px-4 py-4">
                Equipe interna: moderação, aprovação e administração global.
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
