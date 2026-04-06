"use client";

import { useCallback, useEffect, useState } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";

type ErpBusinessDetail = {
  id: string;
  tradeName: string;
  legalName: string | null;
  document: string | null;
  address: Record<string, string> | null;
  inscricaoMunicipal: string | null;
  inscricaoEstadual: string | null;
  taxRegime: string | null;
  cityIbgeCode: string | null;
  fiscalConfig: Record<string, unknown>;
};

type FiscalReadinessCheck = { id: string; ok: boolean; message: string };

type ReadinessPayload = {
  type: "nfse" | "nfe";
  sandbox: boolean;
  ready: boolean;
  checks: FiscalReadinessCheck[];
  productionNotes: string[];
};

const TAX_OPTIONS: { value: string; label: string }[] = [
  { value: "mei", label: "MEI" },
  { value: "simples_nacional", label: "Simples Nacional" },
  { value: "simples_nacional_excesso", label: "Simples — sublimite de receita" },
  { value: "lucro_presumido", label: "Lucro presumido" },
  { value: "lucro_real", label: "Lucro real" },
];

export default function ErpDadosFiscaisPage() {
  const businessId = useSelectedBusinessId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [legalName, setLegalName] = useState("");
  const [document, setDocument] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [uf, setUf] = useState("");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [taxRegime, setTaxRegime] = useState("mei");
  const [cityIbgeCode, setCityIbgeCode] = useState("");
  const [nfseServiceCode, setNfseServiceCode] = useState("01.07");
  const [nfseCnae, setNfseCnae] = useState("6201500");
  const [nfseIssAliquota, setNfseIssAliquota] = useState("2");

  const [readinessType, setReadinessType] = useState<"nfse" | "nfe">("nfse");
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [plugnotasRegistered, setPlugnotasRegistered] = useState(false);
  const [registeringPn, setRegisteringPn] = useState(false);

  const loadBusiness = useCallback(async () => {
    if (!businessId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const res = await erpFetch<ErpBusinessDetail>(`/api/v1/erp/businesses/${businessId}`);
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Não foi possível carregar o negócio.");
      return;
    }
    const b = res.data;
    setLegalName(b.legalName ?? "");
    setDocument(b.document ?? "");
    const addr = b.address ?? {};
    setLogradouro(addr.logradouro ?? "");
    setNumero(addr.numero ?? "");
    setComplemento(addr.complemento ?? "");
    setBairro(addr.bairro ?? "");
    setCep(addr.cep ?? "");
    setUf(addr.uf ?? "");
    setInscricaoMunicipal(b.inscricaoMunicipal ?? "");
    setInscricaoEstadual(b.inscricaoEstadual ?? "");
    setTaxRegime(b.taxRegime ?? "mei");
    setCityIbgeCode(b.cityIbgeCode ?? "");
    const nfse = (b.fiscalConfig?.nfse ?? {}) as Record<string, unknown>;
    setNfseServiceCode(String(nfse.serviceCode ?? "01.07"));
    setNfseCnae(String(nfse.cnae ?? "6201500"));
    setNfseIssAliquota(String(nfse.issAliquota ?? "2"));
    setPlugnotasRegistered(Boolean(b.fiscalConfig?.plugnotasRegistered));
  }, [businessId]);

  const loadReadiness = useCallback(async () => {
    if (!businessId) return;
    setReadinessLoading(true);
    const res = await erpFetch<ReadinessPayload>(
      `/api/v1/erp/fiscal/readiness?type=${readinessType}`,
    );
    setReadinessLoading(false);
    if (res.ok && res.data) setReadiness(res.data);
  }, [businessId, readinessType]);

  useEffect(() => {
    void loadBusiness();
  }, [loadBusiness]);

  useEffect(() => {
    if (businessId) void loadReadiness();
  }, [businessId, readinessType, loadReadiness]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) return;
    setSaving(true);
    setSavedMsg(null);
    setError(null);
    const res = await erpFetch<ErpBusinessDetail>(`/api/v1/erp/businesses/${businessId}`, {
      method: "PATCH",
      body: JSON.stringify({
        legalName: legalName.trim() || undefined,
        document: document.trim() || undefined,
        address: {
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento.trim() || undefined,
          bairro: bairro.trim() || undefined,
          cep: cep.trim(),
          uf: uf.trim().toUpperCase() || undefined,
        },
        inscricaoMunicipal: inscricaoMunicipal.trim() || undefined,
        inscricaoEstadual: inscricaoEstadual.trim() || undefined,
        taxRegime,
        cityIbgeCode: cityIbgeCode.trim() || undefined,
        fiscalConfig: {
          nfse: {
            serviceCode: nfseServiceCode.trim(),
            cnae: nfseCnae.trim(),
            issAliquota: Number(nfseIssAliquota.replace(",", ".")) || 0,
          },
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erro ao salvar.");
      return;
    }
    setSavedMsg("Dados salvos. Atualizamos o checklist abaixo.");
    void loadReadiness();
  }

  async function registerPlugnotas(force: boolean) {
    if (!businessId) return;
    setRegisteringPn(true);
    setError(null);
    setSavedMsg(null);
    const q = force ? "?force=true" : "";
    const res = await erpFetch<{
      ok: boolean;
      alreadyRegistered: boolean;
      message: string;
    }>(`/api/v1/erp/fiscal/register-emitente${q}`, { method: "POST" });
    setRegisteringPn(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Falha ao registrar no PlugNotas.");
      return;
    }
    setSavedMsg(res.data.message);
    if (!res.data.alreadyRegistered || force) {
      setPlugnotasRegistered(true);
    }
    void loadReadiness();
  }

  if (!businessId) {
    return (
      <>
        <PageIntro
          title="Dados fiscais"
          description="Selecione um negócio no topo da área ERP para configurar emitente e NFS-e/NF-e."
          badge="Fiscal"
        />
        <Card className="p-6 text-sm text-marinha-600">Nenhum negócio selecionado.</Card>
      </>
    );
  }

  if (loading) {
    return (
      <div className="h-40 animate-pulse rounded-card bg-marinha-900/10" aria-hidden />
    );
  }

  return (
    <>
      <PageIntro
        title="Dados fiscais do negócio"
        description="Emitente (CNPJ/CPF, endereço, inscrições, IBGE) e parâmetros de NFS-e. NF-e exige NCM de 8 dígitos em cada produto do pedido. Em produção, o certificado digital A1 do CNPJ deve estar cadastrado no PlugNotas."
        badge="Fiscal"
      />

      {error && (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="mb-4 rounded-btn border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          {savedMsg}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-serif text-lg text-marinha-900">Cadastro do emitente</h2>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-marinha-700">
              Razão social
              <input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                placeholder="Nome empresarial registrado"
              />
            </label>
            <label className="block text-sm font-medium text-marinha-700">
              CNPJ / CPF (somente números)
              <input
                value={document}
                onChange={(e) => setDocument(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
                maxLength={14}
              />
            </label>
            <label className="block text-sm font-medium text-marinha-700">
              Regime tributário
              <select
                value={taxRegime}
                onChange={(e) => setTaxRegime(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
              >
                {TAX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-marinha-700">
                Inscrição municipal (NFS-e)
                <input
                  value={inscricaoMunicipal}
                  onChange={(e) => setInscricaoMunicipal(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-marinha-700">
                Inscrição estadual (NF-e; use ISENTO se aplicável)
                <input
                  value={inscricaoEstadual}
                  onChange={(e) => setInscricaoEstadual(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-marinha-700">
              Código IBGE do município (7 dígitos)
              <input
                value={cityIbgeCode}
                onChange={(e) => setCityIbgeCode(e.target.value.replace(/\D/g, "").slice(0, 7))}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
                maxLength={7}
                placeholder="2919207"
              />
            </label>
            <p className="text-xs text-marinha-500">
              Consulte o código em{" "}
              <a
                href="https://www.ibge.gov.br/explica/codigos-dos-municipios.php"
                className="font-semibold text-municipal-700 underline"
                target="_blank"
                rel="noreferrer"
              >
                IBGE — códigos dos municípios
              </a>
              .
            </p>

            <h3 className="pt-2 text-sm font-semibold text-marinha-800">Endereço</h3>
            <label className="block text-sm font-medium text-marinha-700">
              Logradouro
              <input
                value={logradouro}
                onChange={(e) => setLogradouro(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-marinha-700">
                Número
                <input
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-marinha-700">
                Complemento
                <input
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-marinha-700">
              Bairro
              <input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-marinha-700">
                CEP (8 dígitos)
                <input
                  value={cep}
                  onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
                  maxLength={8}
                />
              </label>
              <label className="block text-sm font-medium text-marinha-700">
                UF (NF-e)
                <input
                  value={uf}
                  onChange={(e) => setUf(e.target.value.replace(/\d/g, "").toUpperCase().slice(0, 2))}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                  maxLength={2}
                  placeholder="BA"
                />
              </label>
            </div>

            <h3 className="pt-2 text-sm font-semibold text-marinha-800">NFS-e — lista de serviço (padrão)</h3>
            <p className="text-xs text-marinha-500">
              Ajuste conforme o município; código de serviço e CNAE impactam a NFS-e local.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium text-marinha-700">
                Código serviço
                <input
                  value={nfseServiceCode}
                  onChange={(e) => setNfseServiceCode(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm font-medium text-marinha-700">
                CNAE
                <input
                  value={nfseCnae}
                  onChange={(e) => setNfseCnae(e.target.value.replace(/\D/g, "").slice(0, 7))}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
                />
              </label>
              <label className="block text-sm font-medium text-marinha-700">
                Alíquota ISS (%)
                <input
                  value={nfseIssAliquota}
                  onChange={(e) => setNfseIssAliquota(e.target.value)}
                  className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                />
              </label>
            </div>

            <Button type="submit" disabled={saving} className="mt-2">
              {saving ? "Salvando…" : "Salvar dados fiscais"}
            </Button>
          </form>

          <div className="mt-6 border-t border-marinha-900/10 pt-6">
            <h3 className="text-sm font-semibold text-marinha-900">Cadastro PlugNotas (API)</h3>
            <p className="mt-1 text-xs text-marinha-500">
              A documentação prevê o cadastro do emitente via API (
              <code className="rounded bg-marinha-900/10 px-1">POST /empresa</code>
              ). Preencha CNPJ/CPF e razão social, salve, e registre o emitente — ou isso ocorre
              automaticamente na primeira emissão de nota.
            </p>
            <p className="mt-2 text-xs text-marinha-600">
              Estado:{" "}
              <strong>
                {plugnotasRegistered ? "já registrado nesta base" : "ainda não marcado como registrado"}
              </strong>
              .
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={registeringPn}
                onClick={() => void registerPlugnotas(false)}
              >
                {registeringPn ? "Contactando…" : "Registrar emitente no PlugNotas"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={registeringPn}
                onClick={() => {
                  if (
                    confirm(
                      "Reenviar o cadastro da empresa ao PlugNotas? Use após alterar CNPJ ou dados na conta PlugNotas.",
                    )
                  ) {
                    void registerPlugnotas(true);
                  }
                }}
              >
                Reenviar (?force)
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-serif text-lg text-marinha-900">Prontidão para emissão</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Verificação dos dados do emitente na API. Ambiente:{" "}
            {readiness?.sandbox ? "sandbox" : "produção"}.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setReadinessType("nfse")}
              className={`rounded-btn px-3 py-1.5 text-sm font-semibold ${
                readinessType === "nfse" ?
                  "bg-municipal-600 text-white"
                : "bg-marinha-900/10 text-marinha-700"
              }`}
            >
              NFS-e
            </button>
            <button
              type="button"
              onClick={() => setReadinessType("nfe")}
              className={`rounded-btn px-3 py-1.5 text-sm font-semibold ${
                readinessType === "nfe" ?
                  "bg-municipal-600 text-white"
                : "bg-marinha-900/10 text-marinha-700"
              }`}
            >
              NF-e
            </button>
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-sm"
              onClick={() => void loadReadiness()}
              disabled={readinessLoading}
            >
              Atualizar
            </Button>
          </div>

          {readinessLoading && !readiness && (
            <div className="mt-4 h-24 animate-pulse rounded-btn bg-marinha-900/10" />
          )}

          {readiness && (
            <ul className="mt-4 space-y-2">
              {readiness.checks.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-btn border px-3 py-2 text-sm ${
                    c.ok ? "border-green-200 bg-green-50 text-green-900" : (
                      "border-amber-200 bg-amber-50 text-amber-900"
                    )
                  }`}
                >
                  {c.ok ? "✓ " : "• "}
                  {c.message}
                </li>
              ))}
            </ul>
          )}

          {readiness && (
            <div className="mt-4 rounded-btn border border-marinha-900/15 bg-marinha-900/5 p-3 text-xs text-marinha-600">
              <p className="font-semibold text-marinha-800">Notas</p>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {readiness.productionNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
