import type { Metadata } from "next";
import { ErpHomePanel } from "@/components/erp/erp-home-panel";

export const metadata: Metadata = {
  title: "ERP â€” Ãrea da empresa",
};

export default function ErpPage() {
  return <ErpHomePanel />;
}
