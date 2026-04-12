import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  parseFiscalDocument,
  supportsCurrentCnpjLookup,
} from '../../common/fiscal-document';

/** Resposta bruta https://api.invertexto.com/v1/cnpj/{cnpj} */
export interface CnpjApiResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  natureza_juridica: string;
  capital_social: string;
  data_inicio: string;
  porte: string;
  tipo: string;
  telefone1: string | null;
  telefone2: string | null;
  email: string | null;
  situacao: {
    nome: string;
    data: string;
    motivo: string;
  };
  endereco: {
    tipo_logradouro: string;
    logradouro: string;
    numero: string;
    complemento: string | null;
    bairro: string;
    cep: string;
    uf: string;
    municipio: string;
  };
  simples: {
    optante_simples: string;
    data_opcao: string | null;
    data_exclusao: string | null;
  };
  mei: {
    optante_mei: string;
    data_opcao: string | null;
    data_exclusao: string | null;
  };
  socios: Array<{
    nome: string;
    cpf_cnpj: string;
    data_entrada: string;
    qualificacao: string;
  }>;
  atividade_principal: {
    codigo: string;
    descricao: string;
  };
  atividades_secundarias: Array<{
    codigo: string;
    descricao: string;
  }>;
}

export interface DadosCnpjFormatados {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  natureza_juridica: string;
  capital_social: number;
  data_inicio_atividade: string;
  porte: string;
  tipo_estabelecimento: string;
  telefone: string | null;
  telefone_secundario: string | null;
  email: string | null;
  situacao: {
    nome: string;
    data: string;
    motivo: string;
  };
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
  simples: {
    optante: boolean;
    data_opcao: string | null;
    data_exclusao: string | null;
  };
  mei: {
    optante: boolean;
    data_opcao: string | null;
    data_exclusao: string | null;
  };
  socios: Array<{
    nome: string;
    cpf_cnpj: string;
    data_entrada: string;
    qualificacao: string;
  }>;
  atividade_principal: {
    codigo: string;
    descricao: string;
  };
  atividades_secundarias: Array<{
    codigo: string;
    descricao: string;
  }>;
  /** Sugestao para `erp_businesses.tax_regime` */
  suggestedTaxRegime: 'mei' | 'simples_nacional' | null;
}

@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);

  constructor(private readonly config: ConfigService) {}

  private limparCnpj(cnpj: string): string {
    return parseFiscalDocument(cnpj).normalized;
  }

  async consultarCnpj(cnpj: string): Promise<DadosCnpjFormatados> {
    const cnpjLimpo = this.limparCnpj(cnpj);
    const parsed = parseFiscalDocument(cnpjLimpo);
    if (!parsed.isValid || parsed.kind === 'cpf') {
      throw new BadRequestException('CNPJ invalido');
    }
    if (!supportsCurrentCnpjLookup(parsed.normalized)) {
      throw new ServiceUnavailableException(
        'Consulta automatica indisponivel para CNPJ alfanumerico: o provedor atual ainda aceita apenas CNPJ numerico.',
      );
    }

    const token = this.config.get<string>('cnpj.apiToken', '');
    const baseUrl =
      this.config.get<string>('cnpj.apiBaseUrl') ??
      'https://api.invertexto.com/v1/cnpj';
    if (!token) {
      throw new ServiceUnavailableException(
        'Consulta CNPJ indisponivel: configure CNPJ_API_TOKEN no servidor.',
      );
    }

    const url = `${baseUrl.replace(/\/$/, '')}/${parsed.normalized}?token=${encodeURIComponent(token)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new BadRequestException(
            'CNPJ nao encontrado na base da Receita Federal',
          );
        }
        if (response.status === 429) {
          throw new BadRequestException(
            'Limite de consultas excedido. Tente novamente mais tarde.',
          );
        }
        throw new BadRequestException('Erro ao consultar CNPJ. Tente novamente.');
      }

      const dados = (await response.json()) as CnpjApiResponse;
      return this.formatarDados(dados);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      this.logger.warn(`Erro ao consultar API CNPJ: ${(error as Error).message}`);
      throw new BadRequestException(
        'Erro ao consultar CNPJ. Verifique sua conexao.',
      );
    }
  }

  private formatarDados(dados: CnpjApiResponse): DadosCnpjFormatados {
    const meiOpt = dados.mei?.optante_mei === 'S';
    const simplesOpt = dados.simples?.optante_simples === 'S';
    let suggestedTaxRegime: 'mei' | 'simples_nacional' | null = null;
    if (meiOpt) suggestedTaxRegime = 'mei';
    else if (simplesOpt) suggestedTaxRegime = 'simples_nacional';

    return {
      cnpj: dados.cnpj,
      razao_social: dados.razao_social,
      nome_fantasia: dados.nome_fantasia,
      natureza_juridica: dados.natureza_juridica,
      capital_social: parseFloat(dados.capital_social) || 0,
      data_inicio_atividade: dados.data_inicio,
      porte: this.mapearPorte(dados.porte),
      tipo_estabelecimento: dados.tipo,
      telefone: dados.telefone1,
      telefone_secundario: dados.telefone2,
      email: dados.email,
      situacao: {
        nome: dados.situacao.nome,
        data: dados.situacao.data,
        motivo: dados.situacao.motivo,
      },
      endereco: {
        tipo_logradouro: dados.endereco.tipo_logradouro,
        logradouro: dados.endereco.logradouro,
        numero: dados.endereco.numero,
        complemento: dados.endereco.complemento,
        bairro: dados.endereco.bairro,
        cep: dados.endereco.cep,
        uf: dados.endereco.uf,
        cidade: dados.endereco.municipio,
      },
      simples: {
        optante: simplesOpt,
        data_opcao: dados.simples.data_opcao,
        data_exclusao: dados.simples.data_exclusao,
      },
      mei: {
        optante: meiOpt,
        data_opcao: dados.mei.data_opcao,
        data_exclusao: dados.mei.data_exclusao,
      },
      socios: dados.socios.map((s) => ({
        nome: s.nome,
        cpf_cnpj: s.cpf_cnpj,
        data_entrada: s.data_entrada,
        qualificacao: s.qualificacao,
      })),
      atividade_principal: {
        codigo: dados.atividade_principal.codigo,
        descricao: dados.atividade_principal.descricao,
      },
      atividades_secundarias: dados.atividades_secundarias.map((a) => ({
        codigo: a.codigo,
        descricao: a.descricao,
      })),
      suggestedTaxRegime,
    };
  }

  private mapearPorte(
    porte: string,
  ): string {
    const value = (porte ?? '').toLowerCase();
    if (value.includes('micro')) return 'microempresa';
    if (value.includes('pequeno')) return 'empresa_pequeno_porte';
    if (value.includes('demais')) return 'demais';
    return porte;
  }
}
