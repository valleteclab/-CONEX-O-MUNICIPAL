import { redirect } from "next/navigation";
import { buildEntrarHref } from "@/lib/auth-routes";

type LegacyPlatformLoginPageProps = {
  searchParams?: {
    redirect?: string;
  };
};

export default function LegacyPlatformLoginPage({ searchParams }: LegacyPlatformLoginPageProps) {
  redirect(buildEntrarHref("platform", searchParams?.redirect));
}
