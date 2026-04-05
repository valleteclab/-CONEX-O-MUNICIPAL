import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: {
    default: "Conexão Municipal",
    template: "%s · Conexão Municipal",
  },
  description:
    "Portal inteligente de negócios e capacitação — Luís Eduardo Magalhães (BA).",
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
