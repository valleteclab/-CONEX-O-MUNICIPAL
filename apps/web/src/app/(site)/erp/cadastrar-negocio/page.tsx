"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiAuthFetch } from "@/lib/api-browser";
import {
  isCnpjKind,
  parseFiscalDocument,
  supportsCurrentCnpjLookup,
} from "@/lib/fiscal-document";
import type {
  BusinessSegmentPreset,
  PresetApplicationSummary,
} from "@/types/business-segment";

type DadosCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: { nome: string };
  endereco: {
    tipo_logradouro: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cep: string;
    uf: string;
    cidade: string;
  };
  atividade_principal: { codigo: string; descricao: string };
  suggestedTaxRegime: "mei" | "simples_nacional" | null;
};

type ManualBusinessDraft = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  situacao: { nome: string };
  endereco: DadosCnpj["endereco"];
  atividade_principal: { codigo: string; descricao: string };
  suggestedTaxRegime: "mei" | "simples_nacional" | null;
};

type CreateBusinessResponse = {
  id: string;
  segmentPresetKey?: string | null;
  segmentPresetApplied?: boolean;
  fiscalConfig?: Record<string, unknown>;
};

function mapAddress(e: DadosCnpj["endereco"]) {
  const log = [e.tipo_logradouro, e.logradouro].filter(Boolean).join(" ").trim();
  return {
    logradouro: log || e.logradouro,
    numero: e.numero,
    complemento: e.complemento ?? "",
    bairro: e.bairro,
    cep: e.cep.replace(/\D/g, ""),
    uf: e.uf,
  };
}

function createManualDraft(cnpj: string): ManualBusinessDraft {
  return {
    cnpj,
    razao_social: "",
    nome_fantasia: null,
    situacao: { nome: "Preenchimento manual" },
    endereco: {
      tipo_logradouro: "",
      logradouro: "",
      numero: "",
      complemento: null,
      bairro: "",
      cep: "",
      uf: "",
      cidade: "",
    },
    atividade_principal: { codigo: "", descricao: "" },
    suggestedTaxRegime: null,
  };
}

export default function ErpCadastrarNegocioPage() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosCnpj | null>(null);
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [presets, setPresets] = useState<BusinessSegmentPreset[]>([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState("");
  const [presetAnswers, setPresetAnswers] = useState<Record<string, string>>({});
  const [presetApplication, setPresetApplication] = useState<PresetApplicationSummary | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPresets() {
      const res = await apiAuthFetch<BusinessSegmentPreset[]>("/api/v1/erp/businesses/segment-presets");
      if (!active) return;
      if (res.ok && res.data) {
        setPresets(res.data);
        if (!selectedPresetKey && res.data[0]) {
          setSelectedPresetKey(res.data[0].key);
        }
      }
      setLoadingPresets(false);
    }
    void loadPresets();
    return () => {
      active = false;
    };
  }, [selectedPresetKey]);

  const selectedPreset = useMemo(
    () => presets.find((preset) => preset.key === selectedPresetKey) ?? null,
    [presets, selectedPresetKey],
  );

  function changePreset(nextKey: string) {
    setSelectedPresetKey(nextKey);
    setPresetAnswers({});
  }

  async function consultar() {
    setError(null);
    setSuccess(null);
    setInfo(null);
    setPresetApplication(null);
    setDados(null);

    const parsed = parseFiscalDocument(cnpjInput);
    if (!parsed.isValid || !isCnpjKind(parsed.kind)) {
      setError("Informe um CNPJ valido com 14 caracteres.");
      return;
    }

    if (!supportsCurrentCnpjLookup(parsed.normalized)) {
      setDados(createManualDraft(parsed.normalized));
      setTradeName("");
      setLegalName("");
      setInfo(
        "CNPJ alfanumerico detectado. A consulta automatica ainda depende do provedor atual, entao o cadastro pode seguir em modo manual.",
      );
      return;
    }

    setLoading(true);
    const res = await apiAuthFetch<DadosCnpj>(`/api/v1/erp/cnpj/${parsed.normalized}`);
    setLoading(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Nao foi possivel consultar o CNPJ.");
      return;
    }
    if (
      res.data.situacao?.nome &&
      !String(res.data.situacao.nome).toUpperCase().includes("ATIV")
    ) {
      setError(
        `CNPJ com situacao "${res.data.situacao.nome}". Confirme com a Receita antes de cadastrar.`,
      );
    }
    setDados(res.data);
    setTradeName(
      (res.data.nome_fantasia && res.data.nome_fantasia.trim()) || res.data.razao_social,
    );
    setLegalName(res.data.razao_social);
  }

  async function enviarCadastro() {
    const parsed = parseFiscalDocument(dados?.cnpj ?? cnpjInput);
    if (!parsed.isValid || !isCnpjKind(parsed.kind)) {
      setError("Informe um CNPJ valido antes de continuar.");
      return;
    }
    if (!selectedPresetKey) {
      setError("Escolha um segmento oficial antes de criar o negocio.");
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    setPresetApplication(null);

    const tax =
      dados?.suggestedTaxRegime === "mei" || dados?.suggestedTaxRegime === "simples_nacional"
        ? dados.suggestedTaxRegime
        : undefined;

    const body: Record<string, unknown> = {
      tradeName: tradeName.trim(),
      legalName: legalName.trim(),
      document: parsed.normalized,
      taxRegime: tax,
      segmentPresetKey: selectedPresetKey,
      onboardingAnswers: presetAnswers,
      applyPresetNow: true,
    };

    if (dados && supportsCurrentCnpjLookup(parsed.normalized)) {
      body.address = mapAddress(dados.endereco);
      body.fiscalConfig = {
        cnpjLookup: {
          atividadePrincipal: dados.atividade_principal,
          consultadoEm: new Date().toISOString(),
        },
      };
    }

    const res = await apiAuthFetch<CreateBusinessResponse>("/api/v1/erp/businesses", {
      method: "POST",
      body: JSON.stringify(body),
    });

    setCreating(false);
    if (!res.ok || !res.data) {
      setError(res.error ?? "Erro ao criar cadastro.");
      return;
    }

    const segmentPreset = res.data.fiscalConfig?.segmentPreset as PresetApplicationSummary | undefined;
    if (segmentPreset) {
      setPresetApplication(segmentPreset);
    }

    setSuccess(
      supportsCurrentCnpjLookup(parsed.normalized)
        ? "Cadastro enviado. Aguarde a aprovacao da plataforma para usar o ERP. O preset inicial ja foi preparado para a empresa."
        : "Cadastro interno criado com CNPJ alfanumerico. O segmento inicial foi aplicado e podera ser refinado depois.",
    );
  }

  return (
    <>
      <PageIntro
        title="Cadastrar empresa"
        description="Escolha o segmento, consulte o CNPJ e já entre com um pré-pronto inicial para ERP e presença do negócio."
        badge="ERP"
      />

      {error && (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-btn border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          {info}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-btn border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          {success}{" "}
          <Link href="/erp" className="font-semibold underline">
            Voltar ao ERP
          </Link>
        </div>
      )}

      <Card className="p-6">
        <h2 className="font-serif text-lg text-marinha-900">1. Segmento oficial</h2>
        {loadingPresets ? (
          <p className="mt-2 text-sm text-marinha-500">Carregando segmentos...</p>
        ) : (
          <>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => changePreset(preset.key)}
                  className={`rounded-card border p-4 text-left transition ${
                    selectedPresetKey === preset.key
                      ? "border-municipal-600 bg-municipal-600/5"
                      : "border-marinha-900/10 hover:border-municipal-600/30"
                  }`}
                >
                  <p className="font-semibold text-marinha-900">{preset.name}</p>
                  <p className="mt-2 text-sm text-marinha-600">{preset.summary}</p>
                </button>
              ))}
            </div>

            {selectedPreset ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {selectedPreset.onboardingQuestions.map((question) => (
                  <div key={question.key}>
                    <label className="mb-1 block text-sm font-medium text-marinha-800">{question.label}</label>
                    {question.type === "boolean" ? (
                      <select
                        value={presetAnswers[question.key] ?? ""}
                        onChange={(e) =>
                          setPresetAnswers((current) => ({ ...current, [question.key]: e.target.value }))
                        }
                        className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
                      >
                        <option value="">Selecione</option>
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    ) : question.type === "single_select" ? (
                      <select
                        value={presetAnswers[question.key] ?? ""}
                        onChange={(e) =>
                          setPresetAnswers((current) => ({ ...current, [question.key]: e.target.value }))
                        }
                        className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
                      >
                        <option value="">Selecione</option>
                        {question.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={presetAnswers[question.key] ?? ""}
                        onChange={(e) =>
                          setPresetAnswers((current) => ({ ...current, [question.key]: e.target.value }))
                        }
                        placeholder="Informe um número"
                        inputMode="numeric"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card className="mt-6 p-6">
        <h2 className="font-serif text-lg text-marinha-900">2. Buscar dados da empresa</h2>
        <p className="mt-1 text-sm text-marinha-500">
          Digite o CNPJ para preencher automaticamente as informacoes principais do negocio.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Input
            value={cnpjInput}
            onChange={(e) => setCnpjInput(e.target.value.toUpperCase())}
            placeholder="00.000.000/0001-00 ou AA.AAA.AAA/AAAA-00"
            maxLength={20}
          />
          <Button type="button" disabled={loading} onClick={() => void consultar()}>
            {loading ? "Consultando..." : "Buscar dados"}
          </Button>
        </div>
      </Card>

      {dados && !success && (
        <Card className="mt-6 p-6">
          <h2 className="font-serif text-lg text-marinha-900">3. Conferir e solicitar liberacao</h2>
          <p className="mt-1 text-sm text-marinha-500">
            Revise os dados abaixo antes de enviar o cadastro da empresa para analise.
          </p>
          <div className="mt-3 space-y-3 text-sm">
            <p>
              <span className="text-marinha-500">CNPJ:</span>{" "}
              <span className="font-mono">{dados.cnpj}</span>
            </p>
            <p>
              <span className="text-marinha-500">Situacao:</span> {dados.situacao.nome}
            </p>
            <label className="block font-medium text-marinha-700">
              Nome fantasia (vitrine interna)
              <Input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="mt-1"
              />
            </label>
            <label className="block font-medium text-marinha-700">
              Razao social
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1"
              />
            </label>
            {selectedPreset ? (
              <div className="rounded-btn border border-marinha-900/10 bg-surface px-4 py-3">
                <p className="font-medium text-marinha-900">Pré-pronto selecionado: {selectedPreset.name}</p>
                <p className="mt-1 text-sm text-marinha-600">
                  Foco sugerido: {selectedPreset.erpFocus.join(", ")}
                </p>
              </div>
            ) : null}
            {supportsCurrentCnpjLookup(dados.cnpj) ? (
              <p className="text-marinha-600">
                {dados.endereco.cidade} - {dados.endereco.uf} · CEP {dados.endereco.cep}
              </p>
            ) : (
              <p className="text-marinha-600">
                Cadastro manual para CNPJ alfanumerico. Complete o restante em{" "}
                <Link href="/erp/dados-fiscais" className="font-semibold text-municipal-700 underline">
                  Dados fiscais
                </Link>
                .
              </p>
            )}
          </div>
          <Button
            type="button"
            className="mt-6"
            disabled={creating || !tradeName.trim() || !legalName.trim() || !selectedPresetKey}
            onClick={() => void enviarCadastro()}
          >
            {creating ? "Enviando..." : "Solicitar liberacao da empresa"}
          </Button>
        </Card>
      )}

      {presetApplication ? (
        <Card className="mt-6 p-6">
          <h2 className="font-serif text-lg text-marinha-900">Resumo do preset</h2>
          <div className="mt-4 space-y-2 text-sm text-marinha-600">
            <p><span className="text-marinha-500">Foco:</span> {presetApplication.erpFocus.join(", ")}</p>
            <p><span className="text-marinha-500">Entradas sugeridas:</span> {presetApplication.financeCategories.income.join(", ")}</p>
            <p><span className="text-marinha-500">Saídas sugeridas:</span> {presetApplication.financeCategories.expense.join(", ")}</p>
          </div>
        </Card>
      ) : null}
    </>
  );
}
