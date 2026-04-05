import Link from "next/link";

/**
 * Bloco fixo no topo de /dashboard/plataforma: explica *para quem* é a página e *o que* faz,
 * para não parecer um formulário solto sem contexto.
 */
export function PlatformDashboardHero() {
  return (
    <div className="mb-8 rounded-2xl border-2 border-municipal-600/25 bg-gradient-to-br from-municipal-600/10 via-surface to-cerrado-500/5 px-5 py-6 shadow-sm sm:px-7">
      <p className="text-xs font-bold uppercase tracking-wider text-municipal-800">
        Super administrador · equipa Conexão Municipal
      </p>
      <h1 className="mt-2 font-serif text-2xl font-bold tracking-tight text-marinha-900 sm:text-3xl">
        Centro de gestão da plataforma
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-marinha-700">
        Esta área não é para empresários nem para o painel de um município. Aqui trata da{" "}
        <strong>plataforma inteira</strong>: filas de aprovação e conteúdos da Academia em cada
        tenant.
      </p>
      <ol className="mt-5 space-y-2.5 text-sm text-marinha-800">
        <li className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-municipal-600 text-xs font-bold text-white"
            aria-hidden
          >
            1
          </span>
          <span>
            <strong>Diretório</strong> — aprovar, suspender ou republicar vitrines de negócios
            submetidas pelos municípios.
          </span>
        </li>
        <li className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-municipal-600 text-xs font-bold text-white"
            aria-hidden
          >
            2
          </span>
          <span>
            <strong>ERP</strong> — aprovar ou bloquear cadastros de negócio que usam o ERP no
            portal.
          </span>
        </li>
        <li className="flex gap-3">
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-municipal-600 text-xs font-bold text-white"
            aria-hidden
          >
            3
          </span>
          <span>
            <strong>Academia</strong> — criar cursos por município, publicar e editar aulas
            (YouTube).
          </span>
        </li>
      </ol>
      <p className="mt-5 text-xs text-marinha-600">
        Indicadores do <em>seu</em> município (KPIs locais) estão em{" "}
        <Link href="/painel" className="font-semibold text-municipal-800 underline">
          Painel
        </Link>{" "}
        — outro perfil (gestor municipal).
      </p>
    </div>
  );
}
