"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { apiAuthFetch } from "@/lib/api-browser";
import { getAccessToken } from "@/lib/auth-storage";

export function QuotationResponseForm({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const businessId = useSelectedBusinessId();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!getAccessToken()) {
    return (
      <p className="text-xs text-marinha-500">
        <Link href="/entrar?intent=portal" className="font-semibold text-municipal-700 hover:underline">
          Entre
        </Link>{" "}
        para responder esta oportunidade.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFeedback(null);
    const res = await apiAuthFetch(`/api/v1/quotations/${quotationId}/responses`, {
      method: "POST",
      body: JSON.stringify({
        message,
        responderBusinessId: businessId || undefined,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(res.error || "Não foi possível responder");
      return;
    }
    setMessage("");
    setFeedback("Resposta enviada com sucesso.");
    router.refresh();
  }

  return (
    <form className="mt-3 space-y-2 border-t border-marinha-900/8 pt-3" onSubmit={onSubmit}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-marinha-500">
        Responder oportunidade
      </label>
      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Descreva disponibilidade, prazo, preço estimado ou como entrar em contato."
        className="focus-ring w-full rounded-btn border-2 border-marinha-900/20 bg-white px-3 py-2 text-sm text-marinha-900"
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {feedback ? <p className="text-xs text-green-700">{feedback}</p> : null}
      <button
        type="submit"
        disabled={loading || message.trim().length < 5}
        className="rounded-btn bg-municipal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-municipal-700 disabled:opacity-50"
      >
        {loading ? "Enviando..." : "Enviar resposta"}
      </button>
    </form>
  );
}
