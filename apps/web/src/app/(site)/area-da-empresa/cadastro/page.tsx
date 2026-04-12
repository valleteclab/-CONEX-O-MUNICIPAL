"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-browser";
import { buildEntrarHref } from "@/lib/auth-routes";
import {
  isCnpjKind,
  parseFiscalDocument,
  supportsCurrentCnpjLookup,
} from "@/lib/fiscal-document";

type DadosCnpj = {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  email: string | null;
  telefone: string | null;
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
  atividades_secundarias: Array<{ codigo: string; descricao: string }>;
  suggestedTaxRegime: "mei" | "simples_nacional" | null;
};

type CityOption = {
  id: string;
  code: string;
  state: string;
  name: string;
};

type SignupResponse = {
  businessId: string;
  moderationStatus: string;
  message: string;
};

export default function AreaDaEmpresaCadastroPage() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dados, setDados] = useState<DadosCnpj | null>(null);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCityCode, setSelectedCityCode] = useState("");

  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [password, setPassword] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [inscricaoMunicipal, setInscricaoMunicipal] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [taxRegime, setTaxRegime] = useState("simples_nacional");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cep, setCep] = useState("");
  const [uf, setUf] = useState("");

  const cityLabel = useMemo(() => {
    const selected = cities.find((city) => city.code === selectedCityCode);
    return selected ? `${selected.name} - ${selected.state}` : "";
  }, [cities, selectedCityCode]);

  const parsedDocument = useMemo(() => parseFiscalDocument(dados?.cnpj ?? cnpjInput), [cnpjInput, dados]);

  function hydrateAddressFromLookup(payload: DadosCnpj) {
    const fullLogradouro = [payload.endereco.tipo_logradouro, payload.endereco.logradouro]
      .filter(Boolean)
      .join(" ")
      .trim();

    setLogradouro(fullLogradouro || payload.endereco.logradouro);
    setNumero(payload.endereco.numero);
    setComplemento(payload.endereco.complemento ?? "");
    setBairro(payload.endereco.bairro);
    setCep(payload.endereco.cep.replace(/\D/g, ""));
    setUf(payload.endereco.uf);
  }

  async function consultarCnpj() {
    setError(null);
    setInfo(null);
    setSuccess(null);
    setDados(null);

    const parsed = parseFiscalDocument(cnpjInput);
    if (!parsed.isValid || !isCnpjKind(parsed.kind)) {
      setError("Informe um CNPJ valido com 14 caracteres.");
      return;
    }

    if (!supportsCurrentCnpjLookup(parsed.normalized)) {
      setTradeName("");
      setLegalName("");
      setResponsibleEmail("");
      setResponsiblePhone("");
      setCityQuery("");
      setLogradouro("");
      setNumero("");
      setComplemento("");
      setBairro("");
      setCep("");
      setUf("");
      setInfo(
        "CNPJ alfanumerico detectado. A consulta automatica ainda nao esta disponivel, mas voce pode preencher os dados manualmente abaixo.",
      );
      return;
    }

    setLoadingCnpj(true);
    const response = await apiFetch<DadosCnpj>(`/api/v1/erp/public/cnpj/${parsed.normalized}`);
    setLoadingCnpj(false);

    if (!response.ok || !response.data) {
      setError(response.error ?? "Nao foi possivel consultar o CNPJ.");
      return;
    }

    const payload = response.data;
    setDados(payload);
    setTradeName((payload.nome_fantasia && payload.nome_fantasia.trim()) || payload.razao_social);
    setLegalName(payload.razao_social);
    setResponsibleEmail(payload.email ?? "");
    setResponsiblePhone(payload.telefone ?? "");
    setTaxRegime(payload.suggestedTaxRegime ?? "simples_nacional");
    setCityQuery(`${payload.endereco.cidade} ${payload.endereco.uf}`.trim());
    hydrateAddressFromLookup(payload);
    await buscarCidades(payload.endereco.cidade, payload.endereco.uf);
  }

  async function buscarCidades(query = cityQuery, state?: string) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setError("Informe o nome da cidade para buscar o codigo IBGE.");
      return;
    }

    setLoadingCities(true);
    const response = await apiFetch<CityOption[]>(
      `/api/v1/erp/public/cities?q=${encodeURIComponent(normalizedQuery)}${state ? `&uf=${encodeURIComponent(state)}` : ""}`,
    );
    setLoadingCities(false);

    if (!response.ok || !response.data) {
      setError(response.error ?? "Nao foi possivel buscar cidades.");
      return;
    }

    setCities(response.data);
    const exact = response.data.find(
      (city) =>
        city.name.toLowerCase() === normalizedQuery.toLowerCase() ||
        city.state === (state ?? "").toUpperCase(),
    );
    if (exact) {
      setSelectedCityCode(exact.code);
    } else if (response.data.length === 1) {
      setSelectedCityCode(response.data[0].code);
    }
  }

  async function enviarCadastro() {
    if (!parsedDocument.isValid || !isCnpjKind(parsedDocument.kind)) {
      setError("Informe um CNPJ valido antes de enviar.");
      return;
    }
    if (!selectedCityCode) {
      setError("Selecione uma cidade valida com codigo IBGE.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);
    setSuccess(null);

    const fiscalConfig: Record<string, unknown> = {};
    if (dados) {
      fiscalConfig.cnpjLookup = {
        atividadePrincipal: dados.atividade_principal,
        atividadesSecundarias: dados.atividades_secundarias,
        consultadoEm: new Date().toISOString(),
      };
    }

    const response = await apiFetch<SignupResponse>("/api/v1/erp/public/business-signup", {
      method: "POST",
      body: JSON.stringify({
        responsibleName: responsibleName.trim(),
        responsibleEmail: responsibleEmail.trim(),
        responsiblePhone: responsiblePhone.trim() || undefined,
        password,
        tradeName: tradeName.trim(),
        legalName: legalName.trim(),
        document: parsedDocument.normalized,
        inscricaoMunicipal: inscricaoMunicipal.trim() || undefined,
        inscricaoEstadual: inscricaoEstadual.trim() || undefined,
        cityIbgeCode: selectedCityCode,
        taxRegime,
        address: {
          logradouro: logradouro.trim(),
          numero: numero.trim(),
          complemento: complemento.trim() || undefined,
          bairro: bairro.trim(),
          cep: cep.replace(/\D/g, ""),
          uf: uf.trim().toUpperCase(),
          cityIbgeCode: selectedCityCode,
        },
        ...(Object.keys(fiscalConfig).length > 0 ? { fiscalConfig } : {}),
      }),
    });

    setSubmitting(false);

    if (!response.ok || !response.data) {
      setError(response.error ?? "Nao foi possivel enviar o cadastro empresarial.");
      return;
    }

    setSuccess(response.data.message);
  }

  const canSubmit =
    !submitting &&
    parsedDocument.isValid &&
    isCnpjKind(parsedDocument.kind) &&
    !!responsibleName.trim() &&
    !!responsibleEmail.trim() &&
    !!password.trim() &&
    !!tradeName.trim() &&
    !!legalName.trim() &&
    !!selectedCityCode &&
    !!logradouro.trim() &&
    !!numero.trim() &&
    !!cep.trim() &&
    !!uf.trim();

  return (
    <>
      <PageIntro
        title="Cadastro empresarial completo"
        description="Preencha os dados da empresa, do responsavel e da cidade IBGE para solicitar a liberacao do ERP com prontidao fiscal."
        badge="Area da empresa"
      />

      {error ? (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {info ? (
        <div className="mb-4 rounded-btn border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{info}</div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-btn border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          {success}{" "}
          <Link href={buildEntrarHref("empresa")} className="font-semibold underline">
            Entrar com o responsavel
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">1. Buscar dados pelo CNPJ</h2>
            <p className="mt-1 text-sm text-marinha-500">
              Consulte a Receita para preencher automaticamente os dados principais da empresa.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Input
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value.toUpperCase())}
                placeholder="00.000.000/0001-00 ou AA.AAA.AAA/AAAA-00"
              />
              <Button type="button" disabled={loadingCnpj} onClick={() => void consultarCnpj()}>
                {loadingCnpj ? "Consultando..." : "Buscar CNPJ"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">2. Responsavel pelo ERP</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Nome completo</label>
                <Input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="Nome do responsavel" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">E-mail</label>
                <Input type="email" value={responsibleEmail} onChange={(e) => setResponsibleEmail(e.target.value)} placeholder="financeiro@empresa.com.br" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Telefone</label>
                <Input value={responsiblePhone} onChange={(e) => setResponsiblePhone(e.target.value)} placeholder="(77) 99999-0000" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Senha de acesso</label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 8 caracteres, 1 maiuscula e 1 numero" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">3. Dados fiscais da empresa</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome fantasia</label>
                <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Razao social</label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Inscricao municipal</label>
                <Input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} placeholder="Obrigatoria para NFS-e" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Inscricao estadual</label>
                <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} placeholder="Quando aplicavel" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Regime tributario</label>
                <select
                  value={taxRegime}
                  onChange={(e) => setTaxRegime(e.target.value)}
                  className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
                >
                  <option value="mei">MEI</option>
                  <option value="simples_nacional">Simples Nacional</option>
                  <option value="simples_nacional_excesso">Simples com excesso</option>
                  <option value="lucro_presumido">Lucro presumido</option>
                  <option value="lucro_real">Lucro real</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Cidade IBGE</label>
                <div className="flex gap-2">
                  <Input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} placeholder="Cidade ou codigo IBGE" />
                  <Button type="button" variant="secondary" disabled={loadingCities} onClick={() => void buscarCidades()}>
                    {loadingCities ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-marinha-500">{cityLabel || "Selecione a cidade para emissao fiscal."}</p>
              </div>
              {cities.length > 0 ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Resultado da busca de cidades</label>
                  <select
                    value={selectedCityCode}
                    onChange={(e) => setSelectedCityCode(e.target.value)}
                    className="focus-ring min-h-[44px] w-full rounded-btn border-2 border-marinha-900/25 bg-white px-3 py-2 text-sm text-marinha-900"
                  >
                    <option value="">Selecione uma cidade</option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.code}>
                        {city.name} - {city.state} ({city.code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">4. Endereco fiscal</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Logradouro</label>
                <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, avenida, travessa..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Numero</label>
                <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="123" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Complemento</label>
                <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Sala, bloco, lote..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Bairro</label>
                <Input value={bairro} onChange={(e) => setBairro(e.target.value)} placeholder="Centro" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">CEP</label>
                <Input value={cep} onChange={(e) => setCep(e.target.value)} placeholder="47900-000" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">UF</label>
                <Input value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="BA" maxLength={2} />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">Resumo da analise</h2>
            <div className="mt-4 space-y-3 text-sm text-marinha-600">
              <p>
                O cadastro fica <strong className="text-marinha-900">pendente</strong> ate a prefeitura aprovar a empresa.
              </p>
              <p>
                Apos a aprovacao, o responsavel entra com o e-mail cadastrado e passa a operar o ERP normalmente.
              </p>
              <p>
                O preenchimento correto de CNPJ, cidade IBGE e inscricoes reduz retrabalho e acelera a emissao fiscal.
              </p>
            </div>
          </Card>

          {dados ? (
            <Card className="p-6">
              <h2 className="font-serif text-lg text-marinha-900">Dados trazidos do CNPJ</h2>
              <div className="mt-4 space-y-2 text-sm text-marinha-600">
                <p><span className="text-marinha-500">CNPJ:</span> <span className="font-mono">{dados.cnpj}</span></p>
                <p><span className="text-marinha-500">Situacao:</span> {dados.situacao.nome}</p>
                <p><span className="text-marinha-500">Atividade principal:</span> {dados.atividade_principal.descricao}</p>
                <p><span className="text-marinha-500">Endereco:</span> {dados.endereco.cidade} - {dados.endereco.uf}, CEP {dados.endereco.cep}</p>
              </div>
            </Card>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={!canSubmit}
            onClick={() => void enviarCadastro()}
          >
            {submitting ? "Enviando cadastro..." : "Solicitar liberacao da empresa"}
          </Button>
        </div>
      </div>
    </>
  );
}
