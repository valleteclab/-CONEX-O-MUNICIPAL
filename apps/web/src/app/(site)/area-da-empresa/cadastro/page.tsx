"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-browser";

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

function mapAddress(dados: DadosCnpj["endereco"], cityCode: string) {
  const logradouro = [dados.tipo_logradouro, dados.logradouro].filter(Boolean).join(" ").trim();
  return {
    logradouro: logradouro || dados.logradouro,
    numero: dados.numero,
    complemento: dados.complemento ?? "",
    bairro: dados.bairro,
    cep: dados.cep.replace(/\D/g, ""),
    uf: dados.uf,
    city: dados.cidade,
    cityIbgeCode: cityCode,
  };
}

export default function AreaDaEmpresaCadastroPage() {
  const [cnpjInput, setCnpjInput] = useState("");
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const cityLabel = useMemo(() => {
    const selected = cities.find((city) => city.code === selectedCityCode);
    return selected ? `${selected.name} - ${selected.state}` : "";
  }, [cities, selectedCityCode]);

  async function consultarCnpj() {
    setError(null);
    setSuccess(null);
    setDados(null);
    const digits = cnpjInput.replace(/\D/g, "");
    if (digits.length !== 14) {
      setError("Informe um CNPJ com 14 dígitos.");
      return;
    }

    setLoadingCnpj(true);
    const response = await apiFetch<DadosCnpj>(`/api/v1/erp/public/cnpj/${digits}`);
    setLoadingCnpj(false);

    if (!response.ok || !response.data) {
      setError(response.error ?? "Não foi possível consultar o CNPJ.");
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
    await buscarCidades(payload.endereco.cidade, payload.endereco.uf);
  }

  async function buscarCidades(query = cityQuery, uf?: string) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setError("Informe o nome da cidade para buscar o código IBGE.");
      return;
    }

    setLoadingCities(true);
    const response = await apiFetch<CityOption[]>(
      `/api/v1/erp/public/cities?q=${encodeURIComponent(normalizedQuery)}${uf ? `&uf=${encodeURIComponent(uf)}` : ""}`,
    );
    setLoadingCities(false);

    if (!response.ok || !response.data) {
      setError(response.error ?? "Não foi possível buscar cidades.");
      return;
    }

    setCities(response.data);
    const exact = response.data.find(
      (city) => city.name.toLowerCase() === normalizedQuery.toLowerCase() || city.state === (uf ?? "").toUpperCase(),
    );
    if (exact) {
      setSelectedCityCode(exact.code);
    } else if (response.data.length === 1) {
      setSelectedCityCode(response.data[0].code);
    }
  }

  async function enviarCadastro() {
    if (!dados) {
      setError("Consulte o CNPJ antes de enviar.");
      return;
    }
    if (!selectedCityCode) {
      setError("Selecione uma cidade válida com código IBGE.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const response = await apiFetch<SignupResponse>("/api/v1/erp/public/business-signup", {
      method: "POST",
      body: JSON.stringify({
        responsibleName: responsibleName.trim(),
        responsibleEmail: responsibleEmail.trim(),
        responsiblePhone: responsiblePhone.trim() || undefined,
        password,
        tradeName: tradeName.trim(),
        legalName: legalName.trim(),
        document: dados.cnpj.replace(/\D/g, ""),
        inscricaoMunicipal: inscricaoMunicipal.trim() || undefined,
        inscricaoEstadual: inscricaoEstadual.trim() || undefined,
        cityIbgeCode: selectedCityCode,
        taxRegime,
        address: mapAddress(dados.endereco, selectedCityCode),
        fiscalConfig: {
          cnpjLookup: {
            atividadePrincipal: dados.atividade_principal,
            atividadesSecundarias: dados.atividades_secundarias,
            consultadoEm: new Date().toISOString(),
          },
        },
      }),
    });

    setSubmitting(false);

    if (!response.ok || !response.data) {
      setError(response.error ?? "Não foi possível enviar o cadastro empresarial.");
      return;
    }

    setSuccess(response.data.message);
  }

  return (
    <>
      <PageIntro
        title="Cadastro empresarial completo"
        description="Preencha os dados da empresa, do responsável e da cidade IBGE para solicitar a liberação do ERP com prontidão fiscal."
        badge="Área da empresa"
      />

      {error ? (
        <div className="mb-4 rounded-btn border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      ) : null}
      {success ? (
        <div className="mb-4 rounded-btn border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          {success} <Link href="/area-da-empresa/entrar" className="font-semibold underline">Entrar com o responsável</Link>
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
              <Input value={cnpjInput} onChange={(e) => setCnpjInput(e.target.value)} placeholder="00.000.000/0001-00" />
              <Button type="button" disabled={loadingCnpj} onClick={() => void consultarCnpj()}>
                {loadingCnpj ? "Consultando…" : "Buscar CNPJ"}
              </Button>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">2. Responsável pelo ERP</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Nome completo</label>
                <Input value={responsibleName} onChange={(e) => setResponsibleName(e.target.value)} placeholder="Nome do responsável" />
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
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres, 1 maiúscula e 1 número" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">3. Dados fiscais da empresa</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nome fantasia</label>
                <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} disabled={!dados} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Razão social</label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} disabled={!dados} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Inscrição municipal</label>
                <Input value={inscricaoMunicipal} onChange={(e) => setInscricaoMunicipal(e.target.value)} placeholder="Obrigatória para NFS-e" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Inscrição estadual</label>
                <Input value={inscricaoEstadual} onChange={(e) => setInscricaoEstadual(e.target.value)} placeholder="Quando aplicável" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Regime tributário</label>
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
                  <Input value={cityQuery} onChange={(e) => setCityQuery(e.target.value)} placeholder="Cidade ou código IBGE" />
                  <Button type="button" variant="secondary" disabled={loadingCities} onClick={() => void buscarCidades()}>
                    {loadingCities ? "Buscando…" : "Buscar"}
                  </Button>
                </div>
                <p className="mt-1 text-xs text-marinha-500">{cityLabel || "Selecione a cidade para emissão fiscal."}</p>
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
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-serif text-lg text-marinha-900">Resumo da análise</h2>
            <div className="mt-4 space-y-3 text-sm text-marinha-600">
              <p>
                O cadastro fica <strong className="text-marinha-900">pendente</strong> até a prefeitura aprovar a empresa.
              </p>
              <p>
                Após a aprovação, o responsável entra com o e-mail cadastrado e passa a operar o ERP normalmente.
              </p>
              <p>
                O preenchimento correto de CNPJ, cidade IBGE e inscrições reduz retrabalho e acelera a emissão fiscal.
              </p>
            </div>
          </Card>

          {dados ? (
            <Card className="p-6">
              <h2 className="font-serif text-lg text-marinha-900">Dados trazidos do CNPJ</h2>
              <div className="mt-4 space-y-2 text-sm text-marinha-600">
                <p><span className="text-marinha-500">CNPJ:</span> <span className="font-mono">{dados.cnpj}</span></p>
                <p><span className="text-marinha-500">Situação:</span> {dados.situacao.nome}</p>
                <p><span className="text-marinha-500">Atividade principal:</span> {dados.atividade_principal.descricao}</p>
                <p><span className="text-marinha-500">Endereço:</span> {dados.endereco.cidade} - {dados.endereco.uf}, CEP {dados.endereco.cep}</p>
              </div>
            </Card>
          ) : null}

          <Button
            type="button"
            className="w-full"
            disabled={
              submitting ||
              !dados ||
              !responsibleName.trim() ||
              !responsibleEmail.trim() ||
              !password.trim() ||
              !tradeName.trim() ||
              !legalName.trim() ||
              !selectedCityCode
            }
            onClick={() => void enviarCadastro()}
          >
            {submitting ? "Enviando cadastro…" : "Solicitar liberação da empresa"}
          </Button>
        </div>
      </div>
    </>
  );
}
