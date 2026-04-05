import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Card } from "@/components/ui/card";
import { apiGet, tenantQueryParam } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aulas ao vivo — Academia",
};

type LiveRow = {
  id: string;
  title: string;
  summary: string | null;
  startsAt: string;
  endsAt: string | null;
  meetingUrl: string;
};

type LiveList = { items: LiveRow[]; total: number };

export default async function AcademiaAoVivoPage() {
  const q = tenantQueryParam();
  const data = await apiGet<LiveList>(`/api/v1/academy/live-sessions?${q}&take=50`, {
    revalidate: 60,
  });

  return (
    <>
      <PageIntro
        title="Aulas ao vivo"
        description="Encontros em tempo real (Meet, Zoom ou outro link). Cadastro feito pelo super administrador no painel da plataforma."
      />
      <p className="mb-6 text-sm text-marinha-600">
        <Link href="/academia" className="font-medium text-municipal-700 hover:underline">
          ← Voltar à Academia
        </Link>
      </p>

      {!data?.items.length ? (
        <Card className="p-6">
          <p className="text-sm text-marinha-500">Nenhuma sessão ao vivo publicada.</p>
        </Card>
      ) : (
        <ul className="space-y-4">
          {data.items.map((s) => (
            <li key={s.id}>
              <Card className="p-5">
                <h2 className="font-serif text-lg text-marinha-900">{s.title}</h2>
                {s.summary ? <p className="mt-2 text-sm text-marinha-600">{s.summary}</p> : null}
                <p className="mt-2 text-xs text-marinha-500">
                  {new Date(s.startsAt).toLocaleString("pt-BR")}
                  {s.endsAt ? ` — ${new Date(s.endsAt).toLocaleTimeString("pt-BR")}` : null}
                </p>
                <a
                  href={s.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex min-h-[44px] items-center rounded-btn bg-municipal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-municipal-700"
                >
                  Entrar na sessão
                </a>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
