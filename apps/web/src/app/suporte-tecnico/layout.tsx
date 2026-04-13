import type { Metadata } from "next";
import { SupportLayout } from "@/components/support/support-layout";

export const metadata: Metadata = {
  title: {
    default: "Suporte Técnico",
    template: "%s · Suporte Técnico",
  },
  description: "Central operacional da equipe técnica da plataforma.",
  robots: { index: false, follow: false },
};

export default function SupportRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupportLayout>{children}</SupportLayout>;
}
