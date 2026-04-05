"use client";

import { type ReactNode, useEffect, useRef } from "react";

type ErpFormModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  children: ReactNode;
};

export function ErpFormModal({
  title,
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Salvar",
  children,
}: ErpFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      if (!el.open) el.showModal();
    } else {
      if (el.open) el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="w-full max-w-lg rounded-btn bg-white p-0 shadow-xl backdrop:bg-black/40"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex items-center justify-between border-b border-marinha-900/10 px-6 py-4">
        <h2 className="text-base font-semibold text-marinha-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-btn p-1 text-marinha-500 hover:bg-marinha-50 hover:text-marinha-800"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="px-6 py-5">{children}</div>

      <div className="flex justify-end gap-3 border-t border-marinha-900/10 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-btn border border-marinha-900/20 px-4 py-2 text-sm font-medium text-marinha-700 hover:bg-marinha-50 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="rounded-btn bg-municipal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-municipal-700 disabled:opacity-50"
        >
          {isSubmitting ? "Salvando…" : submitLabel}
        </button>
      </div>
    </dialog>
  );
}
