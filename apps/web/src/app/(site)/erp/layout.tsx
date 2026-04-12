import { ErpTopNav } from "@/components/erp/erp-top-nav";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-8">
      <ErpTopNav />
      <div className="w-full px-3 lg:px-4">{children}</div>
    </div>
  );
}
