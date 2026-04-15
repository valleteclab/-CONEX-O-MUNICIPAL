import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parseFiscalDocument } from '../../common/fiscal-document';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpFiscalDocument } from '../../entities/erp-fiscal-document.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import {
  FiscalProviderDocumentResponse,
  FiscalProviderName,
  IFiscalProvider,
} from './fiscal-provider.interface';

type SpedyInvoiceRaw = {
  id?: string;
  status?: string;
  number?: number | null;
  series?: string | null;
  accessKey?: string | null;
  issuedOn?: string | null;
  authorization?: { date?: string } | null;
  processingDetail?: { status?: string; message?: string; code?: string } | null;
  [key: string]: unknown;
};

type SpedyCompanyRaw = {
  id?: string;
  apiCredentials?: { apiKey?: string };
  [key: string]: unknown;
};

/** Normaliza status Spedy → status interno do domínio */
function normalizeSpedyStatus(
  raw: string | undefined,
): FiscalProviderDocumentResponse['status'] {
  switch ((raw ?? '').toLowerCase()) {
    case 'authorized':
      return 'authorized';
    case 'rejected':
    case 'denied':
      return 'rejected';
    case 'canceled':
      return 'cancelled';
    case 'disabled':
    case 'removed':
      return 'cancelled';
    case 'created':
    case 'enqueued':
    case 'received':
    case 'incontingent':
      return 'processing';
    default:
      return 'processing';
  }
}

/** Mapeia taxRegime interno → taxRegime Spedy */
function mapTaxRegimeToSpedy(regime: string | null): string {
  switch (regime) {
    case 'mei':
      return 'simplesNacionalMEI';
    case 'simples_nacional':
      return 'simplesNacional';
    case 'simples_nacional_excesso':
      return 'simplesNacionalExcessoSublimite';
    case 'lucro_presumido':
    case 'lucro_real':
      return 'regimeNormal';
    default:
      return 'simplesNacional';
  }
}

/** Mapeia regime tributário para ICMS (Simples Nacional vs Regime Normal) */
function buildIcms(
  regime: string | null,
  originCode: string | null | undefined,
): Record<string, unknown> {
  const origin = Number(originCode ?? 0);
  const isSimples =
    regime === 'mei' ||
    regime === 'simples_nacional' ||
    regime === 'simples_nacional_excesso';
  if (isSimples) {
    return { origin, csosn: 400 };
  }
  return { origin, cst: 0, baseTaxModality: 3, rate: 0.12 };
}

@Injectable()
export class SpedyService implements IFiscalProvider {
  readonly name: FiscalProviderName = 'spedy';
  private readonly logger = new Logger(SpedyService.name);
  private readonly baseUrl: string;
  private readonly ownerApiKey: string;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
  ) {
    this.baseUrl = this.config.get<string>('fiscal.spedyBaseUrl', 'https://sandbox-api.spedy.com.br/v1');
    this.ownerApiKey = this.config.get<string>('fiscal.spedyOwnerApiKey', '');
  }

  supportsType(type: 'nfse' | 'nfe' | 'nfce'): boolean {
    return type === 'nfse' || type === 'nfe';
  }

  // ---------------------------------------------------------------------------
  // HTTP client
  // ---------------------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    apiKey?: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const key = apiKey ?? this.ownerApiKey;
    this.logger.debug(`Spedy ${method} ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': key,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      this.logger.error('Spedy network error', err);
      throw new BadGatewayException('Falha de comunicação com a Spedy');
    }

    let text: string;
    try {
      text = await res.text();
    } catch {
      text = '';
    }

    if (!res.ok) {
      this.logger.warn(`Spedy ${res.status}: ${text}`);
      let msg = `Spedy retornou ${res.status}`;
      try {
        const parsed = JSON.parse(text) as {
          errors?: { message?: string }[];
          message?: string;
        };
        if (parsed.errors?.length) {
          msg = parsed.errors.map((e) => e.message).filter(Boolean).join('; ');
        } else if (parsed.message) {
          msg = parsed.message;
        }
      } catch {
        // keep default
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

  /** Upload multipart para certificado */
  private async requestForm<T>(
    path: string,
    form: FormData,
    apiKey?: string,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const key = apiKey ?? this.ownerApiKey;
    this.logger.debug(`Spedy POST (form) ${url}`);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'X-Api-Key': key },
        body: form,
      });
    } catch (err) {
      this.logger.error('Spedy certificate upload network error', err);
      throw new BadGatewayException('Falha de comunicação com a Spedy');
    }

    const text = await res.text().catch(() => '');
    if (!res.ok) {
      this.logger.warn(`Spedy ${res.status}: ${text}`);
      let msg = `Spedy retornou ${res.status}`;
      try {
        const parsed = JSON.parse(text) as { errors?: { message?: string }[]; message?: string };
        if (parsed.errors?.length) {
          msg = parsed.errors.map((e) => e.message).filter(Boolean).join('; ');
        } else if (parsed.message) {
          msg = parsed.message;
        }
      } catch {
        // keep default
      }
      throw new BadGatewayException(msg);
    }

    if (!text) return undefined as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      return { message: text } as unknown as T;
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers internos
  // ---------------------------------------------------------------------------

  private onlyDigits(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '');
  }

  private getSpedyConfig(business: ErpBusiness): Record<string, unknown> {
    const fc = (business.fiscalConfig ?? {}) as Record<string, unknown>;
    const s = fc['spedy'];
    if (typeof s !== 'object' || s === null || Array.isArray(s)) return {};
    return s as Record<string, unknown>;
  }

  private getBusinessApiKey(business: ErpBusiness): string {
    const cfg = this.getSpedyConfig(business);
    return String(cfg['apiKey'] ?? '');
  }

  private getCompanyId(business: ErpBusiness): string {
    const cfg = this.getSpedyConfig(business);
    return String(cfg['companyId'] ?? '');
  }

  private getNfseConfig(business: ErpBusiness): Record<string, unknown> {
    const fc = (business.fiscalConfig ?? {}) as Record<string, unknown>;
    const nfse = fc['nfse'];
    if (typeof nfse !== 'object' || nfse === null || Array.isArray(nfse)) return {};
    return nfse as Record<string, unknown>;
  }

  private buildReceiverAddress(
    party: ErpSalesOrder['party'],
    cityIbgeCode?: string,
  ): Record<string, unknown> | undefined {
    if (!party) return undefined;
    const base: Record<string, unknown> = {};
    if (cityIbgeCode) {
      base['city'] = { code: cityIbgeCode };
    }
    return base;
  }

  private normalizeResponse(raw: SpedyInvoiceRaw): FiscalProviderDocumentResponse {
    return {
      providerId: String(raw.id ?? ''),
      status: normalizeSpedyStatus(raw.status),
      numero: raw.number != null ? String(raw.number) : undefined,
      serie: raw.series ?? undefined,
      chave: raw.accessKey ?? undefined,
      issuedAt: raw.issuedOn ?? undefined,
      authorizedAt: raw.authorization?.date ?? undefined,
      message: raw.processingDetail?.message ?? undefined,
      raw,
    };
  }

  // ---------------------------------------------------------------------------
  // IFiscalProvider — Registro e certificado
  // ---------------------------------------------------------------------------

  async registerEmpresa(business: ErpBusiness): Promise<void> {
    const existing = this.getSpedyConfig(business);
    if (existing['registered']) {
      this.logger.debug(`Spedy: empresa já registrada para business ${business.id}`);
      return;
    }

    const fc = (business.fiscalConfig ?? {}) as Record<string, unknown>;
    const address = ((business.address ?? {}) as Record<string, string>);

    const payload: Record<string, unknown> = {
      name: business.tradeName,
      legalName: business.legalName ?? business.tradeName,
      federalTaxNumber: this.onlyDigits(business.document),
      email: (fc['responsibleEmail'] as string | undefined) ?? undefined,
      address: {
        street: address['logradouro'] ?? '',
        number: address['numero'] ?? 'S/N',
        district: address['bairro'] ?? undefined,
        postalCode: this.onlyDigits(address['cep']),
        additionalInformation: address['complemento'] ?? undefined,
        city: business.cityIbgeCode
          ? { code: business.cityIbgeCode }
          : { name: address['cidade'] ?? '', state: address['uf'] ?? '' },
      },
      taxRegime: mapTaxRegimeToSpedy(business.taxRegime),
    };

    const nfseConfig = this.getNfseConfig(business);
    const cnae = String(nfseConfig['cnae'] ?? '6201500');
    if (cnae) {
      payload['economicActivities'] = [{ code: cnae, isMain: true }];
    }

    const result = await this.request<SpedyCompanyRaw>('POST', '/companies', payload);

    if (!result?.id) {
      throw new BadGatewayException('Spedy não retornou ID da empresa registrada.');
    }

    const updatedConfig: Record<string, unknown> = {
      ...(fc as Record<string, unknown>),
      spedy: {
        ...(existing as Record<string, unknown>),
        companyId: result.id,
        apiKey: result.apiCredentials?.apiKey ?? '',
        registered: true,
      },
    };

    await this.businesses.update(business.id, { fiscalConfig: updatedConfig as any });
    // Atualiza objeto em memória para uso imediato
    business.fiscalConfig = updatedConfig as Record<string, unknown>;
    this.logger.log(`Spedy: empresa registrada — companyId=${result.id}`);
  }

  async uploadCertificate(
    business: ErpBusiness,
    params: {
      password: string;
      filename: string;
      contentType?: string;
      buffer: Buffer;
      email?: string;
    },
  ): Promise<{ certificateId?: string; message?: string }> {
    const companyId = this.getCompanyId(business);
    if (!companyId) {
      throw new BadRequestException(
        'Registre a empresa na Spedy antes de enviar o certificado.',
      );
    }

    const form = new FormData();
    form.append('password', params.password);
    form.append(
      'file',
      new Blob([Uint8Array.from(params.buffer)], {
        type: params.contentType ?? 'application/octet-stream',
      }),
      params.filename,
    );

    await this.requestForm<unknown>(`/companies/${encodeURIComponent(companyId)}/certificates`, form);
    return { message: 'Certificado enviado para a Spedy com sucesso.' };
  }

  // ---------------------------------------------------------------------------
  // IFiscalProvider — Emissão NFS-e
  // ---------------------------------------------------------------------------

  async emitNfse(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): Promise<FiscalProviderDocumentResponse> {
    const apiKey = this.getBusinessApiKey(business);
    if (!apiKey) {
      throw new BadRequestException(
        'Empresa não registrada na Spedy. Acesse Dados Fiscais e registre o emitente.',
      );
    }

    const nfseConfig = this.getNfseConfig(business);
    const serviceCode = String(nfseConfig['serviceCode'] ?? '1.07');
    const cityServiceCode = String(
      nfseConfig['cityServiceCode'] ?? serviceCode.replace('.', ''),
    );
    const issAliquota = Number(nfseConfig['issAliquota'] ?? 2);
    const total = Number(order.totalAmount);

    const description = (order.items ?? [])
      .map((item) => `${item.product?.name ?? item.productId} (Qtd: ${item.qty})`)
      .join('\n');

    const receiver = order.party
      ? {
          name: order.party.legalName ?? order.party.name,
          federalTaxNumber: this.onlyDigits(order.party.document) || undefined,
          email: order.party.email ?? undefined,
        }
      : undefined;

    const payload: Record<string, unknown> = {
      integrationId: integrationId.slice(0, 36),
      effectiveDate: new Date().toISOString(),
      status: 'enqueued',
      sendEmailToCustomer: Boolean(receiver?.email),
      federalServiceCode: serviceCode,
      cityServiceCode,
      taxationType: 'taxationInMunicipality',
      description,
      ...(receiver ? { receiver } : {}),
      total: {
        invoiceAmount: total,
        issRate: issAliquota / 100,
        issAmount: (total * issAliquota) / 100,
        issWithheld: false,
      },
    };

    const raw = await this.request<SpedyInvoiceRaw>('POST', '/service-invoices', payload, apiKey);
    return this.normalizeResponse(raw);
  }

  // ---------------------------------------------------------------------------
  // IFiscalProvider — Emissão NF-e
  // ---------------------------------------------------------------------------

  async emitNfe(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): Promise<FiscalProviderDocumentResponse> {
    const apiKey = this.getBusinessApiKey(business);
    if (!apiKey) {
      throw new BadRequestException(
        'Empresa não registrada na Spedy. Acesse Dados Fiscais e registre o emitente.',
      );
    }

    const total = Number(order.totalAmount);
    const party = order.party;

    const receiver = party
      ? {
          name: party.legalName ?? party.name,
          federalTaxNumber: this.onlyDigits(party.document) || undefined,
          email: party.email ?? undefined,
        }
      : undefined;

    const items = (order.items ?? []).map((item, index) => {
      const product = item.product;
      const qty = Number(item.qty);
      const unitAmount = Number(item.unitPrice);
      const totalAmount = qty * unitAmount;
      const ncm = this.onlyDigits(product?.ncm);
      const cfop = parseInt(product?.cfopDefault ?? '5102', 10);
      const icms = buildIcms(business.taxRegime, product?.originCode);

      return {
        code: product?.sku ?? String(index + 1),
        description: product?.name ?? 'Produto',
        ncm: ncm.length === 8 ? ncm : '00000000',
        cfop,
        unit: product?.unit ?? 'UN',
        quantity: qty,
        unitAmount,
        totalAmount,
        unitTax: product?.unit ?? 'UN',
        quantityTax: qty,
        unitTaxAmount: unitAmount,
        makeupTotal: true,
        taxes: {
          icms,
          pis: { cst: 7 },
          cofins: { cst: 7 },
        },
      };
    });

    const payload: Record<string, unknown> = {
      integrationId: integrationId.slice(0, 36),
      isFinalCustomer: !party?.document,
      effectiveDate: new Date().toISOString(),
      status: 'enqueued',
      operationType: 'outgoing',
      destination: 'internal',
      presenceType: 'internet',
      operationNature: 'Venda de Mercadoria',
      sendEmailToCustomer: Boolean(receiver?.email),
      ...(receiver ? { receiver } : {}),
      items,
      payments: [{ method: '01', amount: total }],
      total: {
        invoiceAmount: total,
        productAmount: total,
      },
    };

    const raw = await this.request<SpedyInvoiceRaw>('POST', '/product-invoices', payload, apiKey);
    return this.normalizeResponse(raw);
  }

  /** NF-e de devolução/retorno */
  async emitNfeReturn(
    business: ErpBusiness,
    order: ErpSalesOrder,
    originalDoc: ErpFiscalDocument,
    items: { productId: string; qty: string; unitPrice: string; totalAmount: string }[],
    integrationId: string,
  ): Promise<FiscalProviderDocumentResponse> {
    const apiKey = this.getBusinessApiKey(business);
    if (!apiKey) {
      throw new BadRequestException('Empresa não registrada na Spedy.');
    }

    const party = order.party;
    const receiver = party
      ? {
          name: party.legalName ?? party.name,
          federalTaxNumber: this.onlyDigits(party.document) || undefined,
          email: party.email ?? undefined,
        }
      : undefined;

    const returnItems = items.map((item, index) => {
      const originalItem = order.items.find((l) => l.productId === item.productId);
      const product = originalItem?.product;
      const qty = Number(item.qty);
      const unitAmount = Number(item.unitPrice);
      const ncm = this.onlyDigits(product?.ncm);
      const cfop = parseInt(product?.cfopDefault ?? '1202', 10);
      const icms = buildIcms(business.taxRegime, product?.originCode);

      return {
        code: product?.sku ?? String(index + 1),
        description: product?.name ?? 'Produto',
        ncm: ncm.length === 8 ? ncm : '00000000',
        cfop,
        unit: product?.unit ?? 'UN',
        quantity: qty,
        unitAmount,
        totalAmount: Number(item.totalAmount),
        unitTax: product?.unit ?? 'UN',
        quantityTax: qty,
        unitTaxAmount: unitAmount,
        makeupTotal: true,
        taxes: { icms, pis: { cst: 7 }, cofins: { cst: 7 } },
      };
    });

    const total = items.reduce((s, i) => s + Number(i.totalAmount), 0);

    const payload: Record<string, unknown> = {
      integrationId: integrationId.slice(0, 36),
      isFinalCustomer: !party?.document,
      effectiveDate: new Date().toISOString(),
      status: 'enqueued',
      operationType: 'incoming',
      destination: 'internal',
      presenceType: 'none',
      operationNature: 'Devolucao de mercadoria',
      purposeType: 'devolution',
      ...(receiver ? { receiver } : {}),
      items: returnItems,
      payments: [{ method: '90', amount: total }],
      total: { invoiceAmount: total, productAmount: total },
    };

    const raw = await this.request<SpedyInvoiceRaw>('POST', '/product-invoices', payload, apiKey);
    return this.normalizeResponse(raw);
  }

  // ---------------------------------------------------------------------------
  // IFiscalProvider — Status, Cancelamento, CC-e
  // ---------------------------------------------------------------------------

  async getStatus(doc: {
    type: 'nfse' | 'nfe' | 'nfce';
    providerId: string;
    business: ErpBusiness;
  }): Promise<FiscalProviderDocumentResponse> {
    if (!this.supportsType(doc.type)) {
      throw new BadRequestException(`Spedy não suporta ${doc.type.toUpperCase()}`);
    }
    const apiKey = this.getBusinessApiKey(doc.business);
    const endpoint =
      doc.type === 'nfse'
        ? `/service-invoices/${encodeURIComponent(doc.providerId)}`
        : `/product-invoices/${encodeURIComponent(doc.providerId)}`;
    const raw = await this.request<SpedyInvoiceRaw>('GET', endpoint, undefined, apiKey);
    return this.normalizeResponse(raw);
  }

  async cancel(
    doc: { type: 'nfse' | 'nfe' | 'nfce'; providerId: string; business: ErpBusiness },
    justification: string,
  ): Promise<unknown> {
    if (!this.supportsType(doc.type)) {
      throw new BadRequestException(`Spedy não suporta ${doc.type.toUpperCase()}`);
    }
    const apiKey = this.getBusinessApiKey(doc.business);
    const endpoint =
      doc.type === 'nfse'
        ? `/service-invoices/${encodeURIComponent(doc.providerId)}`
        : `/product-invoices/${encodeURIComponent(doc.providerId)}`;

    return this.request<unknown>(
      'DELETE',
      endpoint,
      { justification },
      apiKey,
    );
  }

  async sendCce(
    doc: { providerId: string; business: ErpBusiness },
    correction: string,
  ): Promise<unknown> {
    const apiKey = this.getBusinessApiKey(doc.business);
    return this.request<unknown>(
      'POST',
      `/product-invoices/${encodeURIComponent(doc.providerId)}/corrections`,
      { description: correction },
      apiKey,
    );
  }

  /** Verifica se o provedor está minimamente configurado (chave owner presente) */
  isConfigured(): boolean {
    return Boolean(this.ownerApiKey.trim());
  }

  /** Verifica se uma empresa tem registro completo na Spedy */
  isBusinessRegistered(business: ErpBusiness): boolean {
    const cfg = this.getSpedyConfig(business);
    return Boolean(cfg['registered']) && Boolean(cfg['apiKey']);
  }

  /** Retorna o companyId Spedy do business, se registrado */
  getSpedyCompanyId(business: ErpBusiness): string | undefined {
    const id = this.getCompanyId(business);
    return id || undefined;
  }

  /** Consulta dados da empresa registrada na Spedy */
  async getCompanyInfo(business: ErpBusiness): Promise<unknown> {
    const companyId = this.getCompanyId(business);
    if (!companyId) return null;
    return this.request<unknown>('GET', `/companies/${encodeURIComponent(companyId)}`);
  }

  /** Verifica diagnóstico de conectividade com a Spedy */
  async testConnection(): Promise<{ ok: boolean; message: string; details?: string[] }> {
    if (!this.ownerApiKey.trim()) {
      return {
        ok: false,
        message: 'Chave de API da Spedy não configurada (SPEDY_OWNER_API_KEY).',
      };
    }
    try {
      await this.request<unknown>('GET', '/companies?pageSize=1');
      return { ok: true, message: 'Spedy acessível e chave válida.' };
    } catch (err) {
      return {
        ok: false,
        message: 'Falha na conexão com a Spedy.',
        details: [(err as Error).message],
      };
    }
  }

  /** Retorna os municípios suportados para NFS-e */
  async getServiceInvoiceCities(params?: {
    state?: string;
    code?: string;
    page?: number;
  }): Promise<unknown> {
    const q = new URLSearchParams();
    if (params?.state) q.set('state', params.state);
    if (params?.code) q.set('code', params.code);
    if (params?.page) q.set('page', String(params.page));
    const qs = q.toString() ? `?${q.toString()}` : '';
    return this.request<unknown>('GET', `/service-invoices/cities${qs}`);
  }
}
