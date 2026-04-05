import { ErpSubNav } from "@/components/erp/erp-sub-nav";
import { ErpBusinessSelector } from "@/components/erp/erp-business-selector";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ErpBusinessSelector />
      <ErpSubNav />
      {children}
    </>
  );
}
