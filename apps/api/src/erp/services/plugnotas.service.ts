import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PlugNotasDocumentResponse {
  id: string;
  idIntegracao?: string;
  status: string;
  numero?: string;
  serie?: string;
  chave?: string;
  pdf?: string;
  xml?: string;
  mensagem?: string;
  emissao?: string;
  dataAutorizacao?: string;
  [key: string]: unknown;
}

interface PlugNotasEmitResponse {
  documents: PlugNotasDocumentResponse[];
  message?: string;
  protocol?: string;
}

export interface PlugNotasCertificateResponse {
  message?: string;
  data?: {
    id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

@Injectable()
export class PlugNotasService {
  private readonly logger = new Logger(PlugNotasService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = this.config.get<string>('fiscal.plugnotasBaseUrl')!;
    this.apiKey = this.config.get<string>('fiscal.plugnotasApiKey')!;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    this.logger.debug(`PlugNotas ${method} ${url}`);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      this.logger.error('PlugNotas network error', err);
      throw new BadGatewayException('Falha de comunicação com o PlugNotas');
    }

    let text: string;
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    if (!res.ok) {
      this.logger.warn(`PlugNotas ${res.status}: ${text}`);
      let msg = `PlugNotas retornou ${res.status}`;
      try {
        const parsed = JSON.parse(text) as { message?: string; mensagem?: string };
        msg = parsed.message ?? parsed.mensagem ?? msg;
      } catch {
        // keep default message
      }
      throw new BadGatewayException(msg);
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  private unwrapEmitResponse(
    raw: PlugNotasEmitResponse | PlugNotasDocumentResponse[],
  ): PlugNotasDocumentResponse[] {
    if (Array.isArray(raw)) return raw;
    return raw.documents ?? [];
  }

  /** Emitir NFS-e — aceita array de notas */
  async emitNfse(payload: object[]): Promise<PlugNotasDocumentResponse[]> {
    const raw = await this.request<PlugNotasEmitResponse | PlugNotasDocumentResponse[]>('POST', '/nfse', payload);
    return this.unwrapEmitResponse(raw);
  }

  /** Emitir NF-e — aceita array de notas */
  async emitNfe(payload: object[]): Promise<PlugNotasDocumentResponse[]> {
    const raw = await this.request<PlugNotasEmitResponse | PlugNotasDocumentResponse[]>('POST', '/nfe', payload);
    return this.unwrapEmitResponse(raw);
  }

  private authHeaders(): Record<string, string> {
    return {
      'x-api-key': this.apiKey,
    };
  }

  /** Emitir NFC-e — aceita array de notas */
  async emitNfce(payload: object[]): Promise<PlugNotasDocumentResponse[]> {
    const raw = await this.request<PlugNotasEmitResponse | PlugNotasDocumentResponse[]>('POST', '/nfce', payload);
    return this.unwrapEmitResponse(raw);
  }

  async uploadCertificate(params: {
    password: string;
    filename: string;
    contentType?: string;
    buffer: Buffer;
    email?: string;
  }): Promise<PlugNotasCertificateResponse> {
    const url = `${this.baseUrl}/certificado`;
    this.logger.debug(`PlugNotas POST ${url}`);

    const form = new FormData();
    form.append('senha', params.password);
    if (params.email?.trim()) {
      form.append('email', params.email.trim());
    }
    form.append(
      'arquivo',
      new Blob([Uint8Array.from(params.buffer)], {
        type: params.contentType || 'application/octet-stream',
      }),
      params.filename,
    );

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: form,
      });
    } catch (err) {
      this.logger.error('PlugNotas certificate upload network error', err);
      throw new BadGatewayException('Falha de comunicacao com o PlugNotas');
    }

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      this.logger.warn(`PlugNotas ${res.status}: ${text}`);
      let msg = `PlugNotas retornou ${res.status}`;
      try {
        const parsed = JSON.parse(text) as {
          error?: { message?: string };
          message?: string;
        };
        msg = parsed.error?.message ?? parsed.message ?? msg;
      } catch {
        // keep default
      }
      throw new BadGatewayException(msg);
    }

    if (!text) {
      return {};
    }
    try {
      return JSON.parse(text) as PlugNotasCertificateResponse;
    } catch {
      return { message: text };
    }
  }

  /** Consultar status de um documento.
   * NFC-e usa endpoint /nfce/:id/resumo que retorna array — os demais retornam objeto direto.
   */
  async getStatus(
    type: 'nfse' | 'nfe' | 'nfce',
    plugnotasId: string,
  ): Promise<PlugNotasDocumentResponse> {
    if (type === 'nfce') {
      const result = await this.request<PlugNotasDocumentResponse[]>(
        'GET',
        `/nfce/${encodeURIComponent(plugnotasId)}/resumo`,
      );
      return Array.isArray(result) ? result[0] : result;
    }
    return this.request<PlugNotasDocumentResponse>(
      'GET',
      `/${type}/${encodeURIComponent(plugnotasId)}`,
    );
  }

  /**
   * Cancelar documento.
   * Rotas confirmadas via sandbox:
   *   NFS-e → POST /nfse/eventos/cancelamento  { id, justificativa }
   *   NF-e  → POST /nfe/:id/cancelamento        { justificativa }
   *   NFC-e → POST /nfce/:id/cancelamento       { justificativa }
   */
  async cancel(
    type: 'nfse' | 'nfe' | 'nfce',
    plugnotasId: string,
    payload?: Record<string, unknown>,
  ): Promise<unknown> {
    const justificativa = payload?.justificativa;
    if (type === 'nfse') {
      return this.request<unknown>('POST', '/nfse/eventos/cancelamento', {
        id: plugnotasId,
        justificativa,
      });
    }
    return this.request<unknown>(
      'POST',
      `/${type}/${encodeURIComponent(plugnotasId)}/cancelamento`,
      { justificativa },
    );
  }

  /**
   * Enviar Carta de Correção Eletrônica (CC-e) — exclusivo NF-e.
   * Rota: POST /nfe/:idOrChave/cce  { correcao }
   * Requer documento com status CONCLUIDO e texto mínimo de 15 caracteres (SEFAZ).
   */
  async sendCce(plugnotasId: string, correcao: string): Promise<unknown> {
    return this.request<unknown>(
      'POST',
      `/nfe/${encodeURIComponent(plugnotasId)}/cce`,
      { correcao },
    );
  }

  /**
   * Cadastro/atualização do emitente no PlugNotas (empresa que emitirá NF-e/NFS-e).
   * Documentação: https://docs.plugnotas.com.br/ — autenticação `x-api-key` no header.
   */
  async registerEmpresa(payload: object): Promise<void> {
    await this.request<unknown>('POST', '/empresa', payload);
  }
}
