import type { Metadata } from "next";
import { AdminLayout } from "@/components/admin/admin-layout";

export const metadata: Metadata = {
  title: {
    default: "Admin · Conexão Municipal",
    template: "%s · Admin",
  },
  description: "Painel de administração da plataforma Conexão Municipal.",
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminLayout>{children}</AdminLayout>;
}
