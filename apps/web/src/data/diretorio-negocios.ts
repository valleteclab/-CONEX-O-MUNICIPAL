/**
 * Dados de exemplo do diretório. Em produção virão da API.
 * Cada negócio publica uma vitrine: perfil (serviços/contato) ou loja virtual (catálogo).
 */
export type ModoVitrine = "perfil" | "loja";

export type DiretorioNegocio = {
  slug: string;
  nome: string;
  cat: string;
  nota: string;
  modo: ModoVitrine;
  desc: string;
};

export const DIRETORIO_NEGOCIOS: DiretorioNegocio[] = [
  {
    slug: "padaria-central",
    nome: "Padaria Central",
    cat: "Alimentação",
    nota: "4,8",
    modo: "loja",
    desc: "Pães artesanais e doces regionais. Atendimento de segunda a sábado.",
  },
  {
    slug: "eletrica-silva",
    nome: "Elétrica Silva",
    cat: "Serviços",
    nota: "4,5",
    modo: "perfil",
    desc: "Instalações e manutenção elétrica residencial e comercial.",
  },
  {
    slug: "tech-solucoes",
    nome: "Tech Soluções",
    cat: "Tecnologia",
    nota: "5,0",
    modo: "perfil",
    desc: "Suporte em computadores, redes e pequenos sistemas.",
  },
];

const bySlug = Object.fromEntries(DIRETORIO_NEGOCIOS.map((n) => [n.slug, n])) as Record<
  string,
  DiretorioNegocio
>;

export function getNegocioDiretorio(slug: string): DiretorioNegocio | undefined {
  return bySlug[slug];
}

export function listSlugsDiretorio(): string[] {
  return DIRETORIO_NEGOCIOS.map((n) => n.slug);
}
