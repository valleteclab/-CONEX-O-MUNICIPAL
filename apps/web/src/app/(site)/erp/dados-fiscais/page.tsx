"use client";

import { useCallback, useEffect, useState } from "react";
import { PageIntro } from "@/components/layout/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSelectedBusinessId } from "@/hooks/use-selected-business-id";
import { erpFetch } from "@/lib/api-browser";
import { normalizeFiscalDocument } from "@/lib/fiscal-document";

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

type FiscalReadinessCheck = {
  id: string;
  ok: boolean;
  message: string;
  section: "emitente" | "destinatario" | "itens";
};

type ReadinessPayload = {
  type: "nfse" | "nfe" | "nfce";
  sandbox: boolean;
  ready: boolean;
  checks: FiscalReadinessCheck[];
  productionNotes: string[];
};

type SalesOrderOption = { id: string; label: string };

const SECTION_LABELS: Record<string, string> = {
  emitente: "Emitente (dados da empresa)",
  destinatario: "Destinatário (dados do cliente)",
  itens: "Itens do pedido",
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
  const [plugnotasCertificateId, setPlugnotasCertificateId] = useState("");
  const [nfceCscId, setNfceCscId] = useState("");
  const [nfceCscCode, setNfceCscCode] = useState("");
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificatePassword, setCertificatePassword] = useState("");
  const [certificateEmail, setCertificateEmail] = useState("");

  const [readinessType, setReadinessType] = useState<"nfse" | "nfe" | "nfce">("nfse");
  const [readiness, setReadiness] = useState<ReadinessPayload | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [salesOrders, setSalesOrders] = useState<SalesOrderOption[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [plugnotasRegistered, setPlugnotasRegistered] = useState(false);
  const [registeringPn, setRegisteringPn] = useState(false);
  const [uploadingCertificate, setUploadingCertificate] = useState(false);
  const [certificateFeedback, setCertificateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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
    const nfce = (b.fiscalConfig?.nfce ?? {}) as Record<string, unknown>;
    setNfseServiceCode(String(nfse.serviceCode ?? "01.07"));
    setNfseCnae(String(nfse.cnae ?? "6201500"));
    setNfseIssAliquota(String(nfse.issAliquota ?? "2"));
    setPlugnotasCertificateId(String(b.fiscalConfig?.plugnotasCertificateId ?? ""));
    setCertificateEmail(String((b.fiscalConfig?.plugnotasCertificateMeta as Record<string, unknown> | undefined)?.email ?? b.fiscalConfig?.responsibleEmail ?? ""));
    setNfceCscId(String(nfce.cscId ?? ""));
    setNfceCscCode(String(nfce.cscCode ?? ""));
    setPlugnotasRegistered(Boolean(b.fiscalConfig?.plugnotasRegistered));
  }, [businessId]);

  const loadReadiness = useCallback(async (orderId?: string) => {
    if (!businessId) return;
    setReadinessLoading(true);
    const qs = orderId ? `&orderId=${encodeURIComponent(orderId)}` : "";
    const res = await erpFetch<ReadinessPayload>(
      `/api/v1/erp/fiscal/readiness?type=${readinessType}${qs}`,
    );
    setReadinessLoading(false);
    if (res.ok && res.data) setReadiness(res.data);
  }, [businessId, readinessType]);

  const loadSalesOrders = useCallback(async () => {
    if (!businessId) return;
    const res = await erpFetch<{ items: { id: string; code?: string | null; totalAmount: string }[] }>(
      "/api/v1/erp/sales-orders?take=50&skip=0&status=confirmed",
    );
    if (res.ok && res.data) {
      setSalesOrders(
        res.data.items.map((o) => ({
          id: o.id,
          label: `${o.code ?? o.id.slice(0, 8)} — R$ ${Number(o.totalAmount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        })),
      );
    }
  }, [businessId]);

  useEffect(() => {
    void loadBusiness();
  }, [loadBusiness]);

  useEffect(() => {
    if (businessId) {
      void loadReadiness(selectedOrderId || undefined);
      if (readinessType !== "nfse") void loadSalesOrders();
    }
  }, [businessId, readinessType, selectedOrderId, loadReadiness, loadSalesOrders]);

  async function saveFiscalData(options?: { silent?: boolean }) {
    if (!businessId) return;
    setSaving(true);
    if (!options?.silent) setSavedMsg(null);
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
          plugnotasCertificateId: plugnotasCertificateId.trim() || undefined,
          nfse: {
            serviceCode: nfseServiceCode.trim(),
            cnae: nfseCnae.trim(),
            issAliquota: Number(nfseIssAliquota.replace(",", ".")) || 0,
          },
          nfce: {
            cscId: nfceCscId.trim() || undefined,
            cscCode: nfceCscCode.trim() || undefined,
          },
        },
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "Erro ao salvar.");
      return false;
    }
    if (!options?.silent) {
      setSavedMsg("Dados salvos. Atualizamos o checklist abaixo.");
    }
    await loadReadiness();
    return true;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await saveFiscalData();
  }

  async function registerPlugnotas(force: boolean) {
    if (!businessId) return;
    const saved = await saveFiscalData({ silent: true });
    if (!saved) return;
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

  async function handleCertificateUpload() {
    if (!certificateFile) {
      const message = "Selecione o arquivo do certificado A1.";
      setError(message);
      setCertificateFeedback({ type: "error", message });
      return;
    }
    if (!certificatePassword.trim()) {
      const message = "Informe a senha do certificado.";
      setError(message);
      setCertificateFeedback({ type: "error", message });
      return;
    }

    setUploadingCertificate(true);
    setError(null);
    setSavedMsg(null);
    setCertificateFeedback(null);

    const form = new FormData();
    form.append("file", certificateFile);
    form.append("password", certificatePassword.trim());
    if (certificateEmail.trim()) {
      form.append("email", certificateEmail.trim());
    }

    try {
      const res = await erpFetch<{
        ok: boolean;
        certificateId: string;
        emitenteSynced: boolean;
        message: string;
      }>("/api/v1/erp/fiscal/certificate", {
        method: "POST",
        body: form,
      });

      if (!res.ok || !res.data) {
        const message = res.error ?? "Falha ao enviar o certificado.";
        setError(message);
        setCertificateFeedback({ type: "error", message });
        return;
      }

      setSavedMsg(res.data.message);
      setCertificateFeedback({ type: "success", message: res.data.message });
      setCertificatePassword("");
      setCertificateFile(null);
      await loadBusiness();
      await loadReadiness();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha inesperada ao enviar o certificado.";
      setError(message);
      setCertificateFeedback({ type: "error", message });
    } finally {
      setUploadingCertificate(false);
    }
  }

  if (!businessId) {
    return (
      <>
        <PageIntro
          title="Dados fiscais"
          description="Selecione uma empresa para completar o cadastro fiscal e preparar a emissão de notas."
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
        description="Complete os dados da empresa, endereço e inscrições para habilitar a emissão fiscal com mais segurança."
        badge="Fiscal"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card variant="featured" className="border border-marinha-900/8">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Cadastro da empresa</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">
            {legalName?.trim() ? "Preenchido" : "Pendente"}
          </p>
          <p className="mt-1 text-sm text-marinha-500">Razão social, documento e regime tributário.</p>
        </Card>
        <Card className="border border-marinha-900/8">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Integração fiscal</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">
            {plugnotasRegistered ? "Preparada" : "Aguardando configuração"}
          </p>
          <p className="mt-1 text-sm text-marinha-500">Habilitação da emissão após revisão do cadastro.</p>
        </Card>
        <Card className="border border-marinha-900/8">
          <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Checklist</p>
          <p className="mt-2 text-lg font-bold text-marinha-900">
            {readiness?.ready ? "Pronto para emitir" : "Pendências encontradas"}
          </p>
          <p className="mt-1 text-sm text-marinha-500">Confira abaixo os itens validados para NFS-e, NF-e e NFC-e.</p>
        </Card>
      </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-serif text-lg text-marinha-900">Cadastro do emitente</h2>
              <p className="mt-1 text-sm text-marinha-500">
                Revise os dados oficiais da empresa e salve para manter a emissão fiscal pronta para uso.
              </p>
            </div>
            <Badge tone="accent">Etapa 1</Badge>
          </div>
          <form onSubmit={handleSave} className="mt-4 space-y-4">
            <div className="rounded-btn border border-marinha-900/8 bg-marinha-900/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Dados principais</p>
              <div className="mt-3 space-y-4">
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
              CNPJ / CPF
              <input
                value={document}
                onChange={(e) => setDocument(normalizeFiscalDocument(e.target.value))}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
                maxLength={20}
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
              </div>
            </div>

            <div className="rounded-btn border border-marinha-900/8 bg-marinha-900/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-marinha-500">Inscrições e município</p>
              <div className="mt-3 space-y-4">
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
              </div>
            </div>

            <div className="rounded-btn border border-marinha-900/8 bg-marinha-900/[0.03] p-4">
              <h3 className="text-sm font-semibold text-marinha-800">Endereço fiscal</h3>
              <div className="mt-3 space-y-4">
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
              </div>
            </div>

            <div className="rounded-btn border border-marinha-900/8 bg-marinha-900/[0.03] p-4">
            <h3 className="text-sm font-semibold text-marinha-800">Parâmetros de serviço</h3>
            <p className="mt-1 text-xs text-marinha-500">
              Ajuste conforme o município; código de serviço, CNAE e alíquota influenciam a emissão.
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
            </div>

            <div className="rounded-btn border border-marinha-900/8 bg-marinha-900/[0.03] p-4">
              <h3 className="text-sm font-semibold text-marinha-800">PlugNotas e NFC-e</h3>
              <p className="mt-1 text-xs text-marinha-500">
                Envie o certificado A1 do cliente para o PlugNotas e informe os dados CSC da NFC-e para preparar a emissão em produção.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-marinha-700">
                  Certificado A1 (.pfx ou .p12)
                  <input
                    type="file"
                    accept=".pfx,.p12,application/x-pkcs12"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] ?? null)}
                    className="mt-1 block w-full rounded-btn border border-marinha-900/20 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm font-medium text-marinha-700">
                  Senha do certificado
                  <input
                    type="password"
                    value={certificatePassword}
                    onChange={(e) => setCertificatePassword(e.target.value)}
                    className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                    placeholder="Senha do A1"
                  />
                </label>
                <label className="block text-sm font-medium text-marinha-700">
                  E-mail para aviso de vencimento
                  <input
                    type="email"
                    value={certificateEmail}
                    onChange={(e) => setCertificateEmail(e.target.value)}
                    className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                    placeholder="fiscal@empresa.com.br"
                  />
                </label>
                <div className="rounded-btn border border-marinha-900/10 bg-white px-3 py-3 text-sm text-marinha-700">
                  <p className="font-semibold text-marinha-900">Certificado vinculado</p>
                  <p className="mt-1 font-mono text-xs">
                    {plugnotasCertificateId || "Nenhum certificado enviado ainda"}
                  </p>
                  <p className="mt-2 text-xs text-marinha-500">
                    O upload é enviado ao PlugNotas e o ID retornado fica salvo no cadastro fiscal do negócio.
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={uploadingCertificate}
                  onClick={() => void handleCertificateUpload()}
                >
                  {uploadingCertificate ? "Enviando certificado..." : "Enviar certificado para o PlugNotas"}
                </Button>
                {certificateFeedback && (
                  <div
                    className={`mt-3 rounded-btn border px-3 py-2 text-sm ${
                      certificateFeedback.type === "success"
                        ? "border-green-200 bg-green-50 text-green-900"
                        : "border-red-200 bg-red-50 text-red-800"
                    }`}
                  >
                    {certificateFeedback.message}
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-marinha-700">
                  CSC ID (NFC-e)
                  <input
                    value={nfceCscId}
                    onChange={(e) => setNfceCscId(e.target.value)}
                    className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
                    placeholder="1"
                  />
                </label>
                <label className="block text-sm font-medium text-marinha-700">
                  Código CSC (NFC-e)
                  <input
                    value={nfceCscCode}
                    onChange={(e) => setNfceCscCode(e.target.value)}
                    className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
                    placeholder="Código fornecido pela SEFAZ"
                  />
                </label>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="mt-2">
              {saving ? "Salvando…" : "Salvar dados fiscais"}
            </Button>
          </form>

          <div className="mt-6 border-t border-marinha-900/10 pt-6">
            <h3 className="text-sm font-semibold text-marinha-900">Integração fiscal</h3>
            <p className="mt-1 text-sm text-marinha-500">
              Depois de salvar os dados da empresa, você pode concluir a habilitação da emissão fiscal.
            </p>
            <p className="mt-2 text-xs text-marinha-600">
              Status atual:{" "}
              <strong>
                {plugnotasRegistered ? "integração já preparada" : "integração ainda pendente"}
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
                {registeringPn ? "Preparando…" : "Preparar emissão fiscal"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={registeringPn}
                onClick={() => {
                  if (
                    confirm(
                      "Atualizar os dados da empresa na integração fiscal? Use esta opção quando alterar cadastro ou corrigir informações.",
                    )
                  ) {
                    void registerPlugnotas(true);
                  }
                }}
              >
                Atualizar integração
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="font-serif text-lg text-marinha-900">Simulação de emissão</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Selecione o tipo de nota e, opcionalmente, um pedido para ver o checklist completo antes de emitir.
          </p>

          {/* Tipo de nota */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(["nfse", "nfe", "nfce"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setReadinessType(t); setSelectedOrderId(""); }}
                className={`rounded-btn px-3 py-1.5 text-sm font-semibold ${
                  readinessType === t ? "bg-municipal-600 text-white" : "bg-marinha-900/10 text-marinha-700"
                }`}
              >
                {t.toUpperCase().replace("NFSE", "NFS-e").replace("NFCE", "NFC-e")}
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="ml-auto text-sm"
              onClick={() => void loadReadiness(selectedOrderId || undefined)}
              disabled={readinessLoading}
            >
              Atualizar
            </Button>
          </div>

          {/* Seletor de pedido (NF-e e NFC-e) */}
          {readinessType !== "nfse" && (
            <div className="mt-3">
              <label className="block text-xs font-semibold text-marinha-700">
                Simular com pedido de venda (opcional)
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2 text-sm"
              >
                <option value="">— somente dados do emitente —</option>
                {salesOrders.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {salesOrders.length === 0 && (
                <p className="mt-1 text-xs text-marinha-400">Nenhum pedido confirmado encontrado.</p>
              )}
            </div>
          )}

          {readinessLoading && !readiness && (
            <div className="mt-4 h-24 animate-pulse rounded-btn bg-marinha-900/10" />
          )}

          {readiness && (() => {
            const sections = (["emitente", "destinatario", "itens"] as const).filter(
              (s) => readiness.checks.some((c) => c.section === s),
            );
            return (
              <div className="mt-4 space-y-4">
                {sections.map((section) => {
                  const sectionChecks = readiness.checks.filter((c) => c.section === section);
                  const allOk = sectionChecks.every((c) => c.ok);
                  return (
                    <div key={section} className={`rounded-btn border p-3 ${allOk ? "border-green-200 bg-green-50/50" : "border-amber-200 bg-amber-50/50"}`}>
                      <p className={`mb-2 text-xs font-bold uppercase tracking-wide ${allOk ? "text-green-800" : "text-amber-800"}`}>
                        {allOk ? "✓ " : "• "}
                        {SECTION_LABELS[section]}
                      </p>
                      <ul className="space-y-1.5">
                        {sectionChecks.map((c) => (
                          <li
                            key={c.id}
                            className={`rounded border px-3 py-1.5 text-sm ${
                              c.ok ? "border-green-200 bg-green-50 text-green-900" : "border-amber-200 bg-amber-50 text-amber-900"
                            }`}
                          >
                            {c.ok ? "✓ " : "• "}
                            {c.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}

                <div className={`rounded-btn border px-4 py-3 text-sm font-semibold ${readiness.ready ? "border-green-300 bg-green-100 text-green-900" : "border-red-200 bg-red-50 text-red-900"}`}>
                  {readiness.ready
                    ? `Pronto para emitir ${readiness.type.toUpperCase().replace("NFSE", "NFS-e").replace("NFCE", "NFC-e")}.`
                    : `Pendências encontradas — resolva os itens acima antes de emitir.`}
                </div>
              </div>
            );
          })()}

          {readiness && (
            <div className="mt-4 rounded-btn border border-marinha-900/15 bg-marinha-900/5 p-3 text-xs text-marinha-600">
              <p className="font-semibold text-marinha-800">Orientações</p>
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
