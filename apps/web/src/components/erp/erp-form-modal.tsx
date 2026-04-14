"use client";

import { type ReactNode, useEffect, useRef } from "react";

type ErpFormModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  size?: "default" | "wide" | "full";
  children: ReactNode;
};

export function ErpFormModal({
  title,
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Salvar",
  size = "wide",
  children,
}: ErpFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  const sizeClass =
    size === "full"
      ? "max-w-[min(96vw,1400px)]"
      : size === "wide"
        ? "max-w-[min(95vw,1180px)]"
        : "max-w-[min(94vw,920px)]";

  return (
    <dialog
      ref={dialogRef}
      className={`m-auto h-[min(92vh,980px)] w-[min(96vw,1400px)] overflow-hidden rounded-[32px] border border-marinha-900/10 bg-white p-0 shadow-2xl backdrop:bg-marinha-950/45 ${sizeClass}`}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="flex h-full flex-col bg-gradient-to-b from-white via-white to-slate-50/70">
        <div className="flex items-start justify-between gap-4 border-b border-marinha-900/10 px-6 py-5 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-marinha-500">Formulario ERP</p>
            <h2 className="mt-2 font-serif text-xl font-bold text-marinha-900 md:text-2xl">{title}</h2>
            <p className="mt-1 text-sm text-marinha-500">
              Painel amplo para preencher sem perder contexto nem apertar os campos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full border border-marinha-900/10 p-2 text-marinha-500 transition hover:bg-marinha-50 hover:text-marinha-800"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-8">{children}</div>

        <div className="flex flex-col-reverse gap-3 border-t border-marinha-900/10 bg-white/90 px-6 py-4 backdrop-blur sm:flex-row sm:justify-end md:px-8">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-btn border border-marinha-900/20 px-5 py-3 text-sm font-medium text-marinha-700 hover:bg-marinha-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-btn bg-municipal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-municipal-700 disabled:opacity-50"
          >
            {isSubmitting ? "Salvando..." : submitLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
