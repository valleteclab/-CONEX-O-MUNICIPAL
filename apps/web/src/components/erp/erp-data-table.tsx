"use client";

import { type ReactNode } from "react";

export type ErpColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
};

type ErpDataTableProps<T> = {
  columns: ErpColumn<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  keyExtractor: (row: T) => string;
  rowClassName?: (row: T) => string | undefined;
};

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-marinha-900/5 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-3/4 animate-pulse rounded bg-marinha-900/8" />
        </td>
      ))}
    </tr>
  );
}

export function ErpDataTable<T>({
  columns,
  data,
  isLoading = false,
  error,
  emptyMessage = "Nenhum registro encontrado.",
  onRetry,
  onLoadMore,
  hasMore,
  keyExtractor,
  rowClassName,
}: ErpDataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-btn border border-marinha-900/8 bg-white/50">
      <table className="w-full min-w-[min(100%,640px)] text-left text-sm">
        <thead>
          <tr className="border-b border-marinha-900/10 bg-marinha-900/[0.02]">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-semibold text-marinha-700">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && data.length === 0 ? (
            <>
              <SkeletonRow cols={columns.length} />
              <SkeletonRow cols={columns.length} />
              <SkeletonRow cols={columns.length} />
            </>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                <p className="mb-2 text-red-600">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="rounded-btn border border-marinha-900/20 px-3 py-1.5 text-xs font-medium text-marinha-700 hover:bg-marinha-50"
                  >
                    Tentar novamente
                  </button>
                )}
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-marinha-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={`border-b border-marinha-900/5 last:border-0 hover:bg-marinha-900/[0.02] ${rowClassName?.(row) ?? ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-marinha-800">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {hasMore && onLoadMore && (
        <div className="border-t border-marinha-900/8 p-3 text-center">
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            className="rounded-btn border border-marinha-900/20 px-4 py-1.5 text-sm font-medium text-marinha-700 hover:bg-marinha-50 disabled:opacity-50"
          >
            {isLoading ? "Carregando…" : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
