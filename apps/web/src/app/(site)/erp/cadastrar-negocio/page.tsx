"use client";

import { useState } from "react";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiAuthFetch } from "@/lib/api-browser";
import {
  isCnpjKind,
  parseFiscalDocument,
  supportsCurrentCnpjLookup,
} from "@/lib/fiscal-document";

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
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosCnpj | null>(null);

  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");

  async function consultar() {
    setError(null);
    setSuccess(null);
    setInfo(null);
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

    setCreating(true);
    setError(null);
    setSuccess(null);

    const tax =
      dados?.suggestedTaxRegime === "mei" || dados?.suggestedTaxRegime === "simples_nacional"
        ? dados.suggestedTaxRegime
        : undefined;

    const body: Record<string, unknown> = {
      tradeName: tradeName.trim(),
      legalName: legalName.trim(),
      document: parsed.normalized,
      taxRegime: tax,
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

    const res = await apiAuthFetch<{ id: string }>("/api/v1/erp/businesses", {
      method: "POST",
      body: JSON.stringify(body),
    });

    setCreating(false);
    if (!res.ok) {
      setError(res.error ?? "Erro ao criar cadastro.");
      return;
    }

    setSuccess(
      supportsCurrentCnpjLookup(parsed.normalized)
        ? "Cadastro enviado. Aguarde a aprovacao da plataforma para usar o ERP. Apos aprovacao, o emitente sera registrado no PlugNotas automaticamente."
        : "Cadastro interno criado com CNPJ alfanumerico. A emissao fiscal e a consulta automatica ainda dependem da atualizacao dos provedores externos.",
    );
  }

  return (
    <>
      <PageIntro
        title="Cadastrar empresa"
        description="Informe o CNPJ para trazer os dados da empresa, revisar o cadastro e solicitar a liberacao da operacao no ERP."
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
        <h2 className="font-serif text-lg text-marinha-900">1. Buscar dados da empresa</h2>
        <p className="mt-1 text-sm text-marinha-500">
          Digite o CNPJ para preencher automaticamente as informacoes principais do negocio.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={cnpjInput}
            onChange={(e) => setCnpjInput(e.target.value.toUpperCase())}
            placeholder="00.000.000/0001-00 ou AA.AAA.AAA/AAAA-00"
            className="min-w-[200px] flex-1 rounded-btn border border-marinha-900/20 px-3 py-2 text-sm font-mono"
            maxLength={20}
          />
          <Button type="button" disabled={loading} onClick={() => void consultar()}>
            {loading ? "Consultando..." : "Buscar dados"}
          </Button>
        </div>
      </Card>

      {dados && !success && (
        <Card className="mt-6 p-6">
          <h2 className="font-serif text-lg text-marinha-900">2. Conferir e solicitar liberacao</h2>
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
              <input
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2"
              />
            </label>
            <label className="block font-medium text-marinha-700">
              Razao social
              <input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="mt-1 w-full rounded-btn border border-marinha-900/20 px-3 py-2"
              />
            </label>
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
            <p className="text-xs text-marinha-500">
              Depois da aprovacao, complete os dados fiscais da empresa em{" "}
              <Link href="/erp/dados-fiscais" className="font-semibold text-municipal-700 underline">
                Dados fiscais
              </Link>
              .
            </p>
          </div>
          <Button
            type="button"
            className="mt-6"
            disabled={creating || !tradeName.trim() || !legalName.trim()}
            onClick={() => void enviarCadastro()}
          >
            {creating ? "Enviando..." : "Solicitar liberacao da empresa"}
          </Button>
        </Card>
      )}
    </>
  );
}
