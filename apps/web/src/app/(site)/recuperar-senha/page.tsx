import { RecoverPasswordForm } from "@/components/auth/recover-password-form";
import { PageIntro } from "@/components/layout/page-intro";

type RecuperarSenhaPageProps = {
  searchParams?: {
    intent?: string;
  };
};

export default function RecuperarSenhaPage({ searchParams }: RecuperarSenhaPageProps) {
  return (
    <div className="mx-auto w-full max-w-xl">
      <PageIntro
        title="Recuperar senha"
        description="Informe o seu e-mail e enviaremos um link para redefinir a senha com seguranca."
      />

      <RecoverPasswordForm intent={searchParams?.intent} />
    </div>
  );
}
