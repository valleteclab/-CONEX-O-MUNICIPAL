import type { Metadata } from "next";
import Link from "next/link";
import { SuperAdminPanel } from "@/components/plataforma/super-admin-panel";
import { PlatformDashboardHero } from "@/components/plataforma/platform-dashboard-hero";

export const metadata: Metadata = {
  title: "Plataforma — gestão",
  description:
    "Centro de gestão Conexão Municipal: moderação diretório/ERP e Academia por município.",
};

export default function DashboardPlataformaPage() {
  return (
    <>
      <PlatformDashboardHero />
      <p className="mb-8 flex flex-wrap gap-x-4 gap-y-1 text-sm text-marinha-600">
        <Link href="/" className="font-medium text-municipal-700 hover:underline">
          ← Início
        </Link>
        <Link href="/plataforma/entrar" className="font-medium text-municipal-700 hover:underline">
          Trocar sessão (entrada equipa)
        </Link>
      </p>
      <SuperAdminPanel />
    </>
  );
}
