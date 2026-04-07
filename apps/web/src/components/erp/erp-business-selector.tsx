"use client";

import { useErpBusiness } from "@/hooks/use-erp-business";

export function ErpBusinessSelector() {
  const { businesses, selectedId, selected, isLoading, error, hasApproved, selectBusiness } =
    useErpBusiness();

  if (isLoading) {
    return (
      <div className="mb-4 h-9 w-72 animate-pulse rounded-btn bg-marinha-900/10" />
    );
  }

  if (error) {
    return (
      <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="mb-4 rounded-btn border border-municipal-200 bg-municipal-50 px-4 py-3 text-sm text-municipal-800">
        Você ainda não possui uma empresa cadastrada na área de gestão.{" "}
        <a href="/area-da-empresa/cadastro" className="font-semibold underline hover:no-underline">
          Cadastrar empresa
        </a>{" "}
        ou{" "}
        <a href="/erp" className="font-semibold underline hover:no-underline">
          voltar para a área da empresa
        </a>
        .
      </div>
    );
  }

  if (!hasApproved) {
    const pending = businesses.filter((b) => b.moderationStatus === "pending");
    const rejected = businesses.filter((b) => b.moderationStatus === "rejected");
    return (
      <div className="mb-4 rounded-btn border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
        {pending.length > 0 && (
          <span>
            <strong>{pending[0].tradeName}</strong> está em análise. Assim que a empresa for aprovada,
            ela ficará disponível para operação no ERP.
          </span>
        )}
        {rejected.length > 0 && pending.length === 0 && (
          <span>
            <strong>{rejected[0].tradeName}</strong> não foi aprovado. Revise os dados da empresa e,
            se necessário, fale com a plataforma.
          </span>
        )}
      </div>
    );
  }

  const approved = businesses.filter((b) => b.moderationStatus === "approved" && b.isActive);

  if (approved.length === 1 && selectedId) {
    return (
      <div className="mb-4 flex items-center gap-2 text-sm text-marinha-600">
        <span className="rounded-full bg-municipal-100 px-2.5 py-0.5 font-semibold text-municipal-800">
          {selected?.tradeName}
        </span>
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center gap-3">
      <label htmlFor="erp-business-select" className="text-sm font-medium text-marinha-700">
        Negócio:
      </label>
      <select
        id="erp-business-select"
        value={selectedId ?? ""}
        onChange={(e) => selectBusiness(e.target.value)}
        className="rounded-btn border border-marinha-900/20 bg-white px-3 py-1.5 text-sm text-marinha-800 focus:outline-none focus:ring-2 focus:ring-municipal-500"
      >
        {!selectedId && <option value="">— Selecione um negócio —</option>}
        {approved.map((b) => (
          <option key={b.id} value={b.id}>
            {b.tradeName}
          </option>
        ))}
      </select>
    </div>
  );
}
