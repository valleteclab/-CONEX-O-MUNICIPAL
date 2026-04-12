import { ErpTopNav } from "@/components/erp/erp-top-nav";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-8">
      <ErpTopNav />
      <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-6">{children}</div>
    </div>
  );
}
