import type { Metadata } from "next";
import { DirectoryManageForm } from "@/components/auth/directory-manage-form";
import { PageIntro } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "Presença digital",
};

export default function MeuNegocioPage() {
  return (
    <>
      <PageIntro
        title="Presença digital do negócio"
        description="Gerencie perfil público, contatos, serviços e catálogo inicial para diretório e marketplace."
        badge="Dashboard"
      />
      <DirectoryManageForm initialItems={[]} />
    </>
  );
}
