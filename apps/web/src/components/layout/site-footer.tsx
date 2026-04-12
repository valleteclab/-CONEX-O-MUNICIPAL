import Link from "next/link";
import { buildEntrarHref } from "@/lib/auth-routes";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-marinha-900/8 bg-surface-card/80">
      <div className="flex w-full flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-serif text-lg font-bold text-marinha-900">Conexão Municipal</p>
          <p className="mt-1 text-sm text-marinha-500">Luís Eduardo Magalhães - BA</p>
          <p className="mt-3 max-w-md text-sm text-marinha-500">
            Plataforma para descoberta de negócios locais, oportunidades e operação guiada das empresas do município.
          </p>
        </div>

        <div className="grid gap-6 text-sm sm:grid-cols-2">
          <nav className="flex flex-col gap-2" aria-label="Descoberta">
            <p className="font-semibold text-marinha-900">Explorar</p>
            <Link href="/diretorio" className="font-medium text-municipal-700 hover:underline">
              Negócios locais
            </Link>
            <Link href="/oportunidades" className="font-medium text-municipal-700 hover:underline">
              Oportunidades
            </Link>
            <Link href="/academia" className="font-medium text-municipal-700 hover:underline">
              Academia
            </Link>
            <Link href="/area-da-empresa" className="font-medium text-municipal-700 hover:underline">
              Para empresas
            </Link>
          </nav>

          <nav className="flex flex-col gap-2 sm:items-end" aria-label="Acessos">
            <p className="font-semibold text-marinha-900">Acessos</p>
            <Link href={buildEntrarHref("portal")} className="font-medium text-municipal-700 hover:underline">
              Entrar no portal
            </Link>
            <Link href="/cadastro" className="font-medium text-municipal-700 hover:underline">
              Criar conta
            </Link>
            <Link href={buildEntrarHref("platform")} className="font-medium text-municipal-700 hover:underline">
              Equipe da plataforma
            </Link>
            {process.env.NODE_ENV !== "production" ? (
              <Link href="/design-system" className="font-medium text-municipal-700 hover:underline">
                Guia visual
              </Link>
            ) : null}
          </nav>
        </div>
      </div>

      <div className="border-t border-marinha-900/6 px-4 py-4 text-center text-xs text-marinha-500 sm:px-6 lg:px-8">
        LGPD e política de privacidade em evolução. (c) {new Date().getFullYear()} Conexão Municipal
      </div>
    </footer>
  );
}
