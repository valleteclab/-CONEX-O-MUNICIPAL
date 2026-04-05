import type { Metadata } from "next";
import { DirectoryManageForm } from "@/components/auth/directory-manage-form";
import { PageIntro } from "@/components/layout/page-intro";

export const metadata: Metadata = {
  title: "Meu negócio",
};

export default function MeuNegocioPage() {
  return (
    <>
      <PageIntro
        title="Meu negócio"
        description="Crie e edite sua vitrine pública no diretório municipal."
        badge="Dashboard"
      />
      <DirectoryManageForm initialItems={[]} />
    </>
  );
}
