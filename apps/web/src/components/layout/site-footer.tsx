import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-marinha-900/8 bg-surface-card/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div>
          <p className="font-serif text-lg font-bold text-marinha-900">Conexão Municipal</p>
          <p className="mt-1 text-sm text-marinha-500">
            Luís Eduardo Magalhães — BA
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm sm:items-end" aria-label="Rodapé">
          <Link
            href="/design-system"
            className="font-medium text-municipal-700 hover:underline"
          >
            Guia visual (design system)
          </Link>
          <span className="text-marinha-500">LGPD · Política de privacidade (em breve)</span>
        </nav>
      </div>
      <div className="border-t border-marinha-900/6 py-4 text-center text-xs text-marinha-500">
        © {new Date().getFullYear()} Conexão Municipal — protótipo de interface
      </div>
    </footer>
  );
}
