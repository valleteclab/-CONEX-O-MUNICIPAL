import { redirect } from "next/navigation";
import { buildEntrarHref } from "@/lib/auth-routes";

type LegacyCompanyLoginPageProps = {
  searchParams?: {
    redirect?: string;
  };
};

export default function LegacyCompanyLoginPage({ searchParams }: LegacyCompanyLoginPageProps) {
  redirect(buildEntrarHref("empresa", searchParams?.redirect));
}
