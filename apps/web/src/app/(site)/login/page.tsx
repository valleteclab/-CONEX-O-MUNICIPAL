import { redirect } from "next/navigation";
import { buildEntrarHref } from "@/lib/auth-routes";

type LegacyLoginPageProps = {
  searchParams?: {
    redirect?: string;
  };
};

export default function LegacyLoginPage({ searchParams }: LegacyLoginPageProps) {
  redirect(buildEntrarHref("portal", searchParams?.redirect));
}
