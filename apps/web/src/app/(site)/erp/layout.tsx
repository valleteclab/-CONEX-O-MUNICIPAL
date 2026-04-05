import { ErpSubNav } from "@/components/erp/erp-sub-nav";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ErpSubNav />
      {children}
    </>
  );
}
