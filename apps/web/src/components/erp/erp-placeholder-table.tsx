type ErpPlaceholderTableProps = {
  columns: string[];
  emptyMessage?: string;
};

export function ErpPlaceholderTable({
  columns,
  emptyMessage = "Nenhum registro ainda. Os dados virão da API quando a integração estiver ativa.",
}: ErpPlaceholderTableProps) {
  return (
    <div className="overflow-x-auto rounded-btn border border-marinha-900/8 bg-white/50">
      <table className="w-full min-w-[min(100%,640px)] text-left text-sm">
        <thead>
          <tr className="border-b border-marinha-900/10 bg-marinha-900/[0.02]">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold text-marinha-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              colSpan={columns.length}
              className="px-4 py-10 text-center text-marinha-500"
            >
              {emptyMessage}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
