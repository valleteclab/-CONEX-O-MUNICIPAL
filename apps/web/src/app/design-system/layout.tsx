import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Guia visual — Conexão Municipal",
  description:
    "Cores, tipografia e componentes do design system (SDD §10). Referência para equipe e revisão de UI.",
};

export default function DesignSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
