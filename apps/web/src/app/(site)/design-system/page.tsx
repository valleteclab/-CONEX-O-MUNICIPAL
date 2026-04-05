import { PageIntro } from "@/components/layout/page-intro";
import { DesignSystemSections } from "./sections";

const sectionNav = [
  { href: "#intro", label: "Início" },
  { href: "#cores", label: "Cores" },
  { href: "#tipo", label: "Textos" },
  { href: "#botoes", label: "Botões" },
  { href: "#formularios", label: "Formulários" },
  { href: "#cards", label: "Cards" },
  { href: "#status", label: "Status" },
  { href: "#extras", label: "Mais" },
] as const;

export default function DesignSystemPage() {
  return (
    <>
      <PageIntro
        title="Guia visual"
        description="Referência de cores, tipografia e componentes usados nas telas do portal. O menu superior leva às áreas do site; o menu abaixo navega entre seções desta página."
        badge="SDD §10"
      />
      <nav
        className="sticky top-14 z-30 -mx-4 mb-8 flex gap-1 overflow-x-auto border-b border-marinha-900/8 bg-surface/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        aria-label="Seções do guia visual"
      >
        {sectionNav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="focus-ring shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-marinha-500 transition hover:bg-municipal-600/10 hover:text-municipal-700"
          >
            {item.label}
          </a>
        ))}
      </nav>
      <DesignSystemSections />
    </>
  );
}
