import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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
  /** Sugestão para `erp_businesses.tax_regime` */
  suggestedTaxRegime: 'mei' | 'simples_nacional' | null;
}

@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);

  constructor(private readonly config: ConfigService) {}

  private limparCnpj(cnpj: string): string {
    return cnpj.replace(/\D/g, '');
  }

  private validarCnpj(cnpj: string): boolean {
    const cnpjLimpo = this.limparCnpj(cnpj);
    if (cnpjLimpo.length !== 14) return false;
    if (/^(\d)\1+$/.test(cnpjLimpo)) return false;

    let tamanho = cnpjLimpo.length - 2;
    let numeros = cnpjLimpo.substring(0, tamanho);
    const digitos = cnpjLimpo.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0), 10)) return false;

    tamanho += 1;
    numeros = cnpjLimpo.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--;
      if (pos < 2) pos = 9;
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1), 10)) return false;

    return true;
  }

  async consultarCnpj(cnpj: string): Promise<DadosCnpjFormatados> {
    const cnpjLimpo = this.limparCnpj(cnpj);
    if (!this.validarCnpj(cnpjLimpo)) {
      throw new BadRequestException('CNPJ inválido');
    }

    const token = this.config.get<string>('cnpj.apiToken', '');
    const baseUrl =
      this.config.get<string>('cnpj.apiBaseUrl') ??
      'https://api.invertexto.com/v1/cnpj';
    if (!token) {
      throw new ServiceUnavailableException(
        'Consulta CNPJ indisponível: configure CNPJ_API_TOKEN no servidor.',
      );
    }

    const url = `${baseUrl.replace(/\/$/, '')}/${cnpjLimpo}?token=${encodeURIComponent(token)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          throw new BadRequestException(
            'CNPJ não encontrado na base da Receita Federal',
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
        'Erro ao consultar CNPJ. Verifique sua conexão.',
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

  private mapearPorte(porte: string): string {
    const p = porte.toLowerCase();
    if (p.includes('mei') || p.includes('microempreendedor')) return 'MEI';
    if (p.includes('micro empresa') || p.includes('microempresa')) return 'ME';
    if (p.includes('pequeno porte') || p.includes('epp')) return 'EPP';
    if (p.includes('médio') || p.includes('medio')) return 'MEDIO';
    if (p.includes('grande')) return 'GRANDE';
    return porte;
  }
}
