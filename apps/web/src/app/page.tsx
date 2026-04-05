import Link from "next/link";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-surface font-sans text-marinha-900">
      <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-municipal-700">
          Portal piloto
        </p>
        <h1 className="mt-2 font-serif text-4xl font-bold leading-tight text-marinha-900">
          Conexão Municipal
        </h1>
        <p className="mt-4 text-lg text-marinha-500">
          Luís Eduardo Magalhães — negócios, capacitação e serviços ao cidadão.
        </p>
        <Card className="mt-10 w-full text-left">
          <p className="text-sm leading-relaxed text-marinha-500">
            Esta é a página inicial de desenvolvimento. Para ver cores, tipografia e
            componentes alinhados ao projeto, abra o guia visual.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/design-system"
              className="focus-ring inline-flex min-h-[44px] w-full items-center justify-center rounded-btn bg-municipal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-municipal-700 active:scale-[0.98] sm:w-auto"
            >
              Abrir guia visual
            </Link>
          </div>
        </Card>
        <p className="mt-8 text-xs text-marinha-500">
          API: <code className="rounded bg-marinha-900/5 px-1 font-mono text-marinha-900">/api/v1</code>
        </p>
      </div>
    </div>
  );
}
