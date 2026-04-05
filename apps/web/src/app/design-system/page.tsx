import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

const nav = [
  { href: "#intro", label: "Início" },
  { href: "#cores", label: "Cores" },
  { href: "#tipo", label: "Textos" },
  { href: "#botoes", label: "Botões" },
  { href: "#formularios", label: "Formulários" },
  { href: "#cards", label: "Cards" },
  { href: "#status", label: "Status" },
  { href: "#extras", label: "Mais" },
];

const swatches = [
  { token: "municipal-600", hex: "#00a28d", desc: "Cor principal — botões e links" },
  { token: "municipal-700", hex: "#058172", desc: "Hover da cor principal" },
  { token: "marinha-900", hex: "#102a43", desc: "Títulos e texto forte" },
  { token: "marinha-500", hex: "#627d98", desc: "Texto secundário" },
  { token: "cerrado-500", hex: "#f59e0b", desc: "Destaque e avisos especiais" },
  { token: "sucesso-500", hex: "#10b981", desc: "Tudo certo" },
  { token: "alerta-500", hex: "#ef4444", desc: "Erro ou alerta" },
  { token: "Fundo página", hex: "#fafcfe", desc: "Fundo geral da tela" },
];

function CategoryPill({ emoji, label }: { emoji: string; label: string }) {
  return (
    <span className="group inline-flex cursor-default items-center gap-2 rounded-full border border-marinha-900/10 bg-white px-3 py-1.5 text-sm font-medium text-marinha-900 shadow-sm transition hover:shadow-md">
      <span className="transition-transform duration-200 group-hover:scale-110">
        {emoji}
      </span>
      {label}
    </span>
  );
}

function StarRow({ value = 4 }: { value?: number }) {
  return (
    <div className="flex gap-0.5 text-cerrado-500" aria-label={`${value} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i}>{i <= value ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-surface pb-16 font-sans text-marinha-900">
      <header className="sticky top-0 z-40 border-b border-marinha-900/8 bg-surface-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-municipal-700">
              Conexão Municipal
            </p>
            <h1 className="font-serif text-2xl text-marinha-900 sm:text-3xl">
              Guia visual
            </h1>
            <p className="mt-1 max-w-xl text-sm text-marinha-500">
              Referência rápida do design system: cores, tipografia e componentes
              usados no portal.
            </p>
          </div>
          <Link
            href="/"
            className="focus-ring shrink-0 rounded-btn border-2 border-municipal-600/30 px-4 py-2 text-center text-sm font-semibold text-municipal-700 transition hover:bg-municipal-600/10"
          >
            ← Voltar ao início
          </Link>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-marinha-900/6 px-4 py-2 sm:px-6"
          aria-label="Seções"
        >
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="focus-ring shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-marinha-500 transition hover:bg-municipal-600/10 hover:text-municipal-700"
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-4 pt-10 sm:px-6">
        <section id="intro" className="scroll-mt-36">
          <Card variant="featured" className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-bl-full bg-municipal-600/10" />
            <div className="relative">
              <Badge tone="accent">SDD §10</Badge>
              <h2 className="mt-3 font-serif text-2xl">Como usar esta página</h2>
              <p className="mt-2 max-w-2xl text-marinha-500">
                Cada bloco mostra um pedaço da interface: primeiro as{" "}
                <strong className="text-marinha-900">cores oficiais</strong>, depois
                textos, botões e formulários. Use o menu acima para pular direto ao
                que precisa conferir.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-marinha-500 sm:grid-cols-2">
                <li className="flex gap-2">
                  <span className="text-sucesso-500">✓</span>
                  Tom institucional, legível e acessível
                </li>
                <li className="flex gap-2">
                  <span className="text-sucesso-500">✓</span>
                  Sem “cara de template genérico”
                </li>
              </ul>
            </div>
          </Card>
        </section>

        <section id="cores" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Cores</h2>
          <p className="mt-1 text-marinha-500">
            Paleta fixa do projeto — mantenha consistência em novas telas.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {swatches.map((s) => (
              <div
                key={s.token}
                className="overflow-hidden rounded-card border border-marinha-900/8 bg-white shadow-card"
              >
                <div
                  className="h-20 w-full border-b border-marinha-900/6"
                  style={{ backgroundColor: s.hex }}
                />
                <div className="p-3">
                  <p className="font-mono text-xs font-semibold text-marinha-900">
                    {s.token}
                  </p>
                  <p className="font-mono text-xs text-marinha-500">{s.hex}</p>
                  <p className="mt-1 text-xs text-marinha-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="tipo" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Tipografia</h2>
          <p className="mt-1 text-marinha-500">
            Títulos em serif editorial; textos do dia a dia em sans-serif limpa.
          </p>
          <Card className="mt-6 space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Título de página
              </p>
              <p className="font-serif text-4xl font-bold text-marinha-900">
                Luís Eduardo Magalhães
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Subtítulo
              </p>
              <h3 className="font-serif text-xl">Negócios e capacitação</h3>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Corpo
              </p>
              <p className="max-w-prose text-base leading-relaxed text-marinha-900">
                O portal reúne empresários, cidadãos e gestores num só lugar. Textos
                curtos, frases diretas e bom contraste ajudam qualquer pessoa a achar
                o que precisa sem esforço.
              </p>
              <p className="mt-2 text-sm text-marinha-500">
                Texto secundário — datas, legendas e ajudas contextuais.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Código
              </p>
              <code className="block rounded-btn bg-marinha-900/5 p-3 font-mono text-sm text-marinha-900">
                GET /api/v1/health
              </code>
            </div>
          </Card>
        </section>

        <section id="botoes" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Botões</h2>
          <p className="mt-1 text-marinha-500">
            Altura mínima confortável para toque (44px). Foco visível no teclado.
          </p>
          <Card className="mt-6">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primário</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="accent">Destaque</Button>
              <Button variant="ghost">Sutil</Button>
              <Button variant="danger">Excluir</Button>
            </div>
          </Card>
        </section>

        <section id="formularios" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Formulários</h2>
          <p className="mt-1 text-marinha-500">
            Borda 2px; foco em verde-água (anel de foco).
          </p>
          <Card className="mt-6 space-y-4 max-w-lg">
            <div>
              <label htmlFor="nome" className="mb-1 block text-sm font-medium">
                Nome completo
              </label>
              <Input id="nome" placeholder="Como no documento" />
            </div>
            <div>
              <label htmlFor="busca" className="mb-1 block text-sm font-medium">
                Busca
              </label>
              <Input id="busca" type="search" placeholder="O que você procura?" />
            </div>
            <div>
              <label htmlFor="msg" className="mb-1 block text-sm font-medium">
                Mensagem
              </label>
              <Textarea id="msg" placeholder="Escreva aqui…" />
            </div>
            <div>
              <label htmlFor="uf" className="mb-1 block text-sm font-medium">
                Estado
              </label>
              <select
                id="uf"
                className="focus-ring w-full min-h-[44px] rounded-btn border-2 border-marinha-900/12 bg-white px-3 py-2 text-marinha-900 focus:border-municipal-600 focus:outline-none focus:ring-2 focus:ring-municipal-600/25"
              >
                <option>BA</option>
                <option>SP</option>
              </select>
            </div>
          </Card>
        </section>

        <section id="cards" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Cards</h2>
          <p className="mt-1 text-marinha-500">
            Containers com sombra leve; destaque opcional com anel colorido.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <h3 className="font-serif text-lg">Padrão</h3>
              <p className="mt-2 text-sm text-marinha-500">
                Uso geral: listas, resumos e painéis.
              </p>
            </Card>
            <Card variant="featured">
              <h3 className="font-serif text-lg">Em destaque</h3>
              <p className="mt-2 text-sm text-marinha-500">
                Chamadas importantes ou passo atual de um fluxo.
              </p>
            </Card>
            <Card variant="compact" className="md:col-span-2">
              <p className="text-sm text-marinha-500">
                <strong className="text-marinha-900">Compacto</strong> — menos
                padding, bom para barras e filtros.
              </p>
            </Card>
          </div>
        </section>

        <section id="status" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Etiquetas e avisos</h2>
          <p className="mt-1 text-marinha-500">
            Badges para status; faixas para mensagens rápidas.
          </p>
          <Card className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">Rascunho</Badge>
              <Badge tone="accent">Novo</Badge>
              <Badge tone="success">Publicado</Badge>
              <Badge tone="warning">Atenção</Badge>
              <Badge tone="danger">Erro</Badge>
            </div>
            <div className="space-y-2 rounded-card border border-sucesso-500/25 bg-sucesso-500/10 p-4 text-sm text-marinha-900">
              <strong>Sucesso</strong> — Cadastro concluído com segurança.
            </div>
            <div className="space-y-2 rounded-card border border-alerta-500/25 bg-alerta-500/10 p-4 text-sm text-marinha-900">
              <strong>Algo deu errado</strong> — Verifique os dados e tente de novo.
            </div>
          </Card>
        </section>

        <section id="extras" className="scroll-mt-36">
          <h2 className="font-serif text-2xl">Mais componentes</h2>
          <p className="mt-1 text-marinha-500">
            Padrões usados em listagens e carregamento.
          </p>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <Card>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Categoria (emoji)
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <CategoryPill emoji="🍞" label="Padaria" />
                <CategoryPill emoji="🔧" label="Serviços" />
              </div>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Avaliação
              </p>
              <div className="mt-3 flex items-center gap-3">
                <StarRow value={4} />
                <span className="text-sm text-marinha-500">4,0 · 128 opiniões</span>
              </div>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Avatar (iniciais)
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar label="Maria Souza" size="sm" />
                <Avatar label="João Pereira" size="md" />
                <Avatar label="Ana Lima Costa" size="lg" />
              </div>
            </Card>
            <Card>
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Carregando (skeleton)
              </p>
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-4 h-24 w-full rounded-card" />
              </div>
            </Card>
            <Card className="md:col-span-2">
              <p className="text-xs font-semibold uppercase text-marinha-500">
                Paginação
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {[1, 2, 3, "…", 8].map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`min-h-[44px] min-w-[44px] rounded-btn border-2 text-sm font-semibold transition focus-ring ${
                      p === 1
                        ? "border-municipal-600 bg-municipal-600 text-white"
                        : "border-marinha-900/12 bg-white text-marinha-900 hover:border-municipal-600/40"
                    }`}
                    disabled={p === "…"}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <footer className="border-t border-marinha-900/8 pt-8 text-center text-sm text-marinha-500">
          <p>
            Conexão Municipal — design system (referência interna).{" "}
            <Link href="/" className="font-semibold text-municipal-700 underline-offset-2 hover:underline">
              Início
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
