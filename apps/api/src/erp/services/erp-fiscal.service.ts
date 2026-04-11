import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpFiscalDocument } from '../../entities/erp-fiscal-document.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import {
  EmitFiscalDto,
  FiscalDocumentType,
  FiscalPaymentMethod,
} from '../dto/fiscal.dto';
import {
  PlugNotasDocumentResponse,
  PlugNotasService,
} from './plugnotas.service';

export type FiscalReadinessCheck = {
  id: string;
  ok: boolean;
  message: string;
};

export type FiscalReadinessPayload = {
  type: FiscalDocumentType;
  sandbox: boolean;
  ready: boolean;
  checks: FiscalReadinessCheck[];
  productionNotes: string[];
};

function normalizeStatus(raw: string): ErpFiscalDocument['status'] {
  const status = (raw ?? '').toUpperCase();
  if (
    status === 'CONCLUIDO' ||
    status === 'AUTORIZADO' ||
    status === 'AUTHORIZED'
  ) {
    return 'authorized';
  }
  if (status === 'REJEITADO' || status === 'REJECTED') {
    return 'rejected';
  }
  if (status === 'CANCELADO' || status === 'CANCELLED') {
    return 'cancelled';
  }
  if (
    status === 'PROCESSANDO' ||
    status === 'PROCESSING' ||
    status === 'AGUARDANDO'
  ) {
    return 'processing';
  }
  if (status === 'ERRO' || status === 'ERROR') {
    return 'error';
  }
  return 'processing';
}

@Injectable()
export class ErpFiscalService {
  private readonly logger = new Logger(ErpFiscalService.name);

  constructor(
    @InjectRepository(ErpFiscalDocument)
    private readonly docs: Repository<ErpFiscalDocument>,
    @InjectRepository(ErpSalesOrder)
    private readonly orders: Repository<ErpSalesOrder>,
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
    private readonly plugnotas: PlugNotasService,
    private readonly config: ConfigService,
  ) {}

  async list(
    business: ErpBusiness,
    take = 50,
    skip = 0,
  ): Promise<{ items: ErpFiscalDocument[]; total: number }> {
    const [items, total] = await this.docs.findAndCount({
      where: { businessId: business.id, tenantId: business.tenantId },
      order: { createdAt: 'DESC' },
      take: Math.min(take, 100),
      skip,
      relations: ['salesOrder'],
    });
    return { items, total };
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpFiscalDocument> {
    const doc = await this.docs.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: ['salesOrder'],
    });
    if (!doc) {
      throw new NotFoundException('Documento fiscal nao encontrado');
    }
    return doc;
  }

  async registerEmitentePlugnotas(
    business: ErpBusiness,
    options?: { force?: boolean },
  ): Promise<{
    ok: true;
    alreadyRegistered: boolean;
    message: string;
  }> {
    const fiscalConfig = this.getFiscalConfig(business);
    if (fiscalConfig['plugnotasRegistered'] && !options?.force) {
      return {
        ok: true,
        alreadyRegistered: true,
        message:
          'Emitente ja registrado no PlugNotas. Use force=true para reenviar o cadastro.',
      };
    }

    const documentDigits = this.onlyDigits(business.document);
    if (documentDigits.length !== 11 && documentDigits.length !== 14) {
      throw new BadRequestException(
        'Informe CNPJ ou CPF valido do negocio antes de registrar no PlugNotas.',
      );
    }
    if (
      typeof fiscalConfig['plugnotasCertificateId'] !== 'string' ||
      !String(fiscalConfig['plugnotasCertificateId']).trim()
    ) {
      throw new BadRequestException(
        'Envie o certificado A1 do emitente antes de registrar a empresa no PlugNotas.',
      );
    }

    await this.plugnotas.registerEmpresa(
      this.buildPlugnotasEmpresaPayload(business),
    );

    const nextFiscalConfig = {
      ...fiscalConfig,
      plugnotasRegistered: true,
    };
    await this.businesses.update(business.id, { fiscalConfig: nextFiscalConfig });
    business.fiscalConfig = nextFiscalConfig;

    return {
      ok: true,
      alreadyRegistered: false,
      message: 'Empresa cadastrada ou atualizada no PlugNotas.',
    };
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
  ): Promise<{
    ok: true;
    certificateId: string;
    emitenteSynced: boolean;
    message: string;
  }> {
    const filename = params.filename.trim();
    const lower = filename.toLowerCase();
    if (!lower.endsWith('.pfx') && !lower.endsWith('.p12')) {
      throw new BadRequestException(
        'Envie um certificado A1 com extensao .pfx ou .p12.',
      );
    }
    if (!params.password.trim()) {
      throw new BadRequestException(
        'Informe a senha de instalacao do certificado digital.',
      );
    }

    const upload = await this.plugnotas.uploadCertificate({
      ...params,
      filename,
      password: params.password.trim(),
      email: params.email?.trim() || business.responsibleEmail || undefined,
    });

    const certificateId =
      (typeof upload.data?.id === 'string' && upload.data.id) || '';
    if (!certificateId) {
      throw new BadRequestException(
        'PlugNotas nao retornou o ID do certificado enviado.',
      );
    }

    const fiscalConfig = this.getFiscalConfig(business);
    const nextFiscalConfig = {
      ...fiscalConfig,
      plugnotasCertificateId: certificateId,
      plugnotasRegistered: false,
      plugnotasCertificateMeta: {
        filename,
        uploadedAt: new Date().toISOString(),
        email: params.email?.trim() || business.responsibleEmail || null,
      },
    };
    await this.businesses.update(business.id, { fiscalConfig: nextFiscalConfig });
    business.fiscalConfig = nextFiscalConfig;

    try {
      await this.registerEmitentePlugnotas(business, { force: true });
      return {
        ok: true,
        certificateId,
        emitenteSynced: true,
        message:
          'Certificado enviado com sucesso e emitente sincronizado no PlugNotas.',
      };
    } catch (error) {
      return {
        ok: true,
        certificateId,
        emitenteSynced: false,
        message: `Certificado enviado com sucesso. Revise os dados fiscais antes de sincronizar o emitente: ${this.describeError(error)}`,
      };
    }
  }

  getEmitReadiness(
    business: ErpBusiness,
    type: FiscalDocumentType,
  ): FiscalReadinessPayload {
    const sandbox = this.config.get<boolean>('fiscal.sandbox', true);
    const checks = this.buildBusinessChecks(business, type);
    const productionNotes: string[] = [];

    if (sandbox) {
      productionNotes.push(
        'Sandbox PlugNotas: os retornos sao de homologacao e nao geram documento fiscal valido.',
      );
    } else {
      productionNotes.push(
        'Producao: envie ou vincule um certificado A1 valido no PlugNotas antes da primeira emissao.',
      );
      productionNotes.push(
        'Configure API_PUBLIC_URL para receber webhooks e evitar polling manual de autorizacao.',
      );
    }

    if (type === 'nfse') {
      productionNotes.push(
        'NFS-e: confirme codigo de servico, CNAE e aliquota ISS conforme a prefeitura do municipio.',
      );
    }

    if (type === 'nfe') {
      productionNotes.push(
        'NF-e: cada item do pedido precisa ter NCM valido e cadastro tributario minimamente consistente.',
      );
    }

    if (type === 'nfce') {
      productionNotes.push(
        'NFC-e: configure CSC (id e codigo) no cadastro fiscal da empresa para assinar o QR Code do cupom.',
      );
      productionNotes.push(
        'Use NFC-e para venda ao consumidor final, normalmente originada do PDV ou balcao.',
      );
    }

    const fiscalConfig = this.getFiscalConfig(business);
    if (!fiscalConfig['plugnotasCertificateId']) {
      productionNotes.push(
        'Se o cadastro do emitente for feito pela API deste projeto, informe o ID do certificado salvo no PlugNotas em Dados Fiscais.',
      );
    }

    return {
      type,
      sandbox,
      ready: checks.every((check) => check.ok),
      checks,
      productionNotes,
    };
  }

  async emitFromOrder(
    business: ErpBusiness,
    dto: EmitFiscalDto,
  ): Promise<ErpFiscalDocument> {
    const existing = await this.docs.findOne({
      where: {
        salesOrderId: dto.orderId,
        type: dto.type,
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (
      existing &&
      existing.status !== 'error' &&
      existing.status !== 'rejected'
    ) {
      throw new BadRequestException(
        `Ja existe um documento ${dto.type.toUpperCase()} para este pedido (status: ${existing.status}).`,
      );
    }

    const order = await this.orders.findOne({
      where: {
        id: dto.orderId,
        businessId: business.id,
        tenantId: business.tenantId,
      },
      relations: ['items', 'items.product', 'party'],
    });
    if (!order) {
      throw new NotFoundException('Pedido de venda nao encontrado');
    }
    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        'Somente pedidos confirmados podem gerar documento fiscal.',
      );
    }

    this.assertEmitPrerequisites(business, order, dto);
    await this.ensureEmpresaRegistered(business);

    const integrationId = `${order.id}-${dto.type}`;
    let remote: PlugNotasDocumentResponse;

    try {
      let responses: PlugNotasDocumentResponse[];
      if (dto.type === 'nfse') {
        responses = await this.plugnotas.emitNfse(
          this.buildNfsePayload(business, order, integrationId),
        );
      } else if (dto.type === 'nfce') {
        responses = await this.plugnotas.emitNfce(
          this.buildNfcePayload(
            business,
            order,
            integrationId,
            dto.paymentMethod ?? 'cash',
          ),
        );
      } else {
        responses = await this.plugnotas.emitNfe(
          this.buildNfePayload(business, order, integrationId),
        );
      }
      remote = responses[0];
    } catch (error) {
      const errDoc = existing ?? this.docs.create();
      errDoc.tenantId = business.tenantId;
      errDoc.businessId = business.id;
      errDoc.salesOrderId = order.id;
      errDoc.type = dto.type;
      errDoc.idIntegracao = integrationId;
      errDoc.status = 'error';
      errDoc.errorMessage = (error as Error).message;
      await this.docs.save(errDoc);
      throw error;
    }

    const doc = existing ?? this.docs.create();
    doc.tenantId = business.tenantId;
    doc.businessId = business.id;
    doc.salesOrderId = order.id;
    doc.type = dto.type;
    doc.plugnotasId = remote.id ?? null;
    doc.idIntegracao = remote.idIntegracao ?? integrationId;
    doc.status = normalizeStatus(remote.status ?? 'processing');
    doc.numero = remote.numero ?? null;
    doc.serie = remote.serie ?? null;
    doc.chave = remote.chave ?? null;
    doc.xmlUrl = remote.xml ?? null;
    doc.pdfUrl = remote.pdf ?? null;
    doc.rawResponse = remote as unknown as object;
    doc.emittedAt = new Date();
    doc.errorMessage = null;
    return this.docs.save(doc);
  }

  async refreshStatus(
    business: ErpBusiness,
    docId: string,
  ): Promise<ErpFiscalDocument> {
    const doc = await this.findOne(business, docId);
    if (!doc.plugnotasId) {
      throw new BadRequestException(
        'Documento sem ID PlugNotas; nao e possivel consultar o status.',
      );
    }

    const remote = await this.plugnotas.getStatus(doc.type, doc.plugnotasId);
    doc.status = normalizeStatus(remote.status ?? doc.status);
    doc.numero = remote.numero ?? doc.numero;
    doc.serie = remote.serie ?? doc.serie;
    doc.chave = remote.chave ?? doc.chave;
    doc.xmlUrl = remote.xml ?? doc.xmlUrl;
    doc.pdfUrl = remote.pdf ?? doc.pdfUrl;
    doc.rawResponse = remote as unknown as object;
    return this.docs.save(doc);
  }

  async cancel(
    business: ErpBusiness,
    docId: string,
  ): Promise<ErpFiscalDocument> {
    const doc = await this.findOne(business, docId);
    if (doc.status !== 'authorized') {
      throw new BadRequestException(
        'Somente documentos autorizados podem ser cancelados.',
      );
    }
    if (!doc.plugnotasId) {
      throw new BadRequestException('Documento sem ID PlugNotas.');
    }

    await this.plugnotas.cancel(doc.type, doc.plugnotasId);
    doc.status = 'cancelled';
    return this.docs.save(doc);
  }

  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const plugnotasId = typeof payload.id === 'string' ? payload.id : undefined;
    if (!plugnotasId) {
      return;
    }

    const doc = await this.docs.findOne({ where: { plugnotasId } });
    if (!doc) {
      return;
    }

    doc.status = normalizeStatus(String(payload.status ?? ''));
    doc.numero =
      typeof payload.numero === 'string' ? payload.numero : doc.numero;
    doc.serie = typeof payload.serie === 'string' ? payload.serie : doc.serie;
    doc.chave = typeof payload.chave === 'string' ? payload.chave : doc.chave;
    doc.xmlUrl = typeof payload.xml === 'string' ? payload.xml : doc.xmlUrl;
    doc.pdfUrl = typeof payload.pdf === 'string' ? payload.pdf : doc.pdfUrl;
    doc.rawResponse = payload;
    await this.docs.save(doc);

    this.logger.log(
      `Webhook PlugNotas: documento ${doc.id} atualizado para ${doc.status}.`,
    );
  }

  private assertEmitPrerequisites(
    business: ErpBusiness,
    order: ErpSalesOrder,
    dto: EmitFiscalDto,
  ): void {
    const errors = this.buildBusinessChecks(business, dto.type)
      .filter((check) => !check.ok)
      .map((check) => check.message);

    if (order.party) {
      const partyDocumentDigits = this.onlyDigits(order.party.document);
      if (
        partyDocumentDigits &&
        partyDocumentDigits.length !== 11 &&
        partyDocumentDigits.length !== 14
      ) {
        errors.push(
          'Cliente do pedido com CPF ou CNPJ invalido; atualize o cadastro antes de emitir.',
        );
      }
    }

    if (dto.type === 'nfce' && !dto.paymentMethod) {
      errors.push('Informe a forma de pagamento para emitir NFC-e.');
    }

    if (dto.type !== 'nfse') {
      for (const item of order.items ?? []) {
        const ncm = this.onlyDigits(item.product?.ncm);
        if (ncm.length !== 8) {
          errors.push(
            `Produto "${item.product?.name ?? item.productId}" precisa ter NCM com 8 digitos para ${dto.type.toUpperCase()}.`,
          );
        }
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException([
        'Dados fiscais incompletos para emissao.',
        ...errors,
      ]);
    }
  }

  private buildBusinessChecks(
    business: ErpBusiness,
    type: FiscalDocumentType,
  ): FiscalReadinessCheck[] {
    const checks: FiscalReadinessCheck[] = [];
    const documentDigits = this.onlyDigits(business.document);
    const legalName = (business.legalName ?? business.tradeName ?? '').trim();
    const address = this.getAddress(business);
    const cep = this.onlyDigits(address.cep);
    const ibgeCode = (business.cityIbgeCode ?? '').trim();
    const fiscalConfig = this.getFiscalConfig(business);

    checks.push({
      id: 'emitente_documento',
      ok: documentDigits.length === 11 || documentDigits.length === 14,
      message:
        documentDigits.length === 11 || documentDigits.length === 14
          ? 'Documento do emitente preenchido.'
          : 'Informe CPF ou CNPJ valido do emitente.',
    });
    checks.push({
      id: 'emitente_razao',
      ok: legalName.length >= 2,
      message:
        legalName.length >= 2
          ? 'Razao social ou nome fantasia preenchido.'
          : 'Informe razao social ou nome fantasia do negocio.',
    });
    checks.push({
      id: 'emitente_logradouro',
      ok: address.logradouro.length >= 3,
      message:
        address.logradouro.length >= 3
          ? 'Logradouro do emitente preenchido.'
          : 'Preencha o logradouro do endereco do emitente.',
    });
    checks.push({
      id: 'emitente_numero',
      ok: address.numero.length >= 1,
      message:
        address.numero.length >= 1
          ? 'Numero do endereco preenchido.'
          : 'Preencha o numero do endereco do emitente.',
    });
    checks.push({
      id: 'emitente_cep',
      ok: cep.length === 8,
      message:
        cep.length === 8
          ? 'CEP do emitente valido.'
          : 'CEP do emitente deve ter 8 digitos.',
    });
    checks.push({
      id: 'emitente_ibge',
      ok: /^\d{7}$/.test(ibgeCode),
      message: /^\d{7}$/.test(ibgeCode)
        ? 'Codigo IBGE do municipio informado.'
        : 'Informe o codigo IBGE de 7 digitos do municipio do emitente.',
    });
    checks.push({
      id: 'plugnotas_certificado',
      ok: typeof fiscalConfig['plugnotasCertificateId'] === 'string' &&
        String(fiscalConfig['plugnotasCertificateId']).trim().length > 0,
      message:
        typeof fiscalConfig['plugnotasCertificateId'] === 'string' &&
        String(fiscalConfig['plugnotasCertificateId']).trim().length > 0
          ? 'Certificado A1 vinculado ao PlugNotas.'
          : 'Envie o certificado A1 do emitente para o PlugNotas.',
    });

    if (type === 'nfse') {
      const inscricaoMunicipal = (business.inscricaoMunicipal ?? '').trim();
      checks.push({
        id: 'nfse_im',
        ok: inscricaoMunicipal.length >= 1,
        message:
          inscricaoMunicipal.length >= 1
            ? 'Inscricao municipal informada.'
            : 'Inscricao municipal e obrigatoria para NFS-e.',
      });
      return checks;
    }

    const uf = address.uf.toUpperCase();
    const inscricaoEstadual = (business.inscricaoEstadual ?? '').trim();
    const isMei = business.taxRegime === 'mei';

    checks.push({
      id: 'comercial_uf',
      ok: uf.length === 2,
      message:
        uf.length === 2
          ? 'UF do emitente informada.'
          : 'Informe a UF do emitente para documentos de mercadoria.',
    });
    checks.push({
      id: 'comercial_ie',
      ok: inscricaoEstadual.length >= 1 || isMei,
      message:
        inscricaoEstadual.length >= 1
          ? 'Inscricao estadual informada.'
          : isMei
            ? 'Regime MEI identificado; revise a necessidade de IE com a contabilidade.'
            : 'Informe inscricao estadual ou ISENTO para emitir NF-e ou NFC-e.',
    });

    if (type === 'nfce') {
      const nfceConfig = this.getNestedConfig(business, 'nfce');
      const cscId = String(nfceConfig.cscId ?? '').trim();
      const cscCode = String(nfceConfig.cscCode ?? '').trim();

      checks.push({
        id: 'nfce_csc_id',
        ok: cscId.length >= 1,
        message:
          cscId.length >= 1
            ? 'Identificador CSC configurado.'
            : 'Informe o identificador CSC da NFC-e em Dados Fiscais.',
      });
      checks.push({
        id: 'nfce_csc_code',
        ok: cscCode.length >= 6,
        message:
          cscCode.length >= 6
            ? 'Codigo CSC configurado.'
            : 'Informe o codigo CSC da NFC-e em Dados Fiscais.',
      });
    }

    return checks;
  }

  private buildNfsePayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): object[] {
    const address = this.getAddress(business);
    const nfseConfig = this.getNestedConfig(business, 'nfse');
    const description = order.items
      .map((item) => `${item.product?.name ?? item.productId} (${item.qty})`)
      .join('; ');

    return [
      {
        idIntegracao: integrationId,
        prestador: {
          cpfCnpj: this.onlyDigits(business.document),
          inscricaoMunicipal: business.inscricaoMunicipal ?? '',
          razaoSocial: business.legalName ?? business.tradeName,
          endereco: {
            logradouro: address.logradouro || 'Endereco nao informado',
            numero: address.numero || 'S/N',
            complemento: address.complemento || undefined,
            bairro: address.bairro || undefined,
            codigoMunicipio: business.cityIbgeCode ?? undefined,
            cep: this.onlyDigits(address.cep),
          },
        },
        tomador: order.party
          ? {
              cpfCnpj: this.onlyDigits(order.party.document) || undefined,
              razaoSocial: order.party.legalName ?? order.party.name,
              email: order.party.email ?? undefined,
            }
          : { razaoSocial: 'Consumidor Final' },
        servico: {
          codigo: String(nfseConfig.serviceCode ?? '01.07'),
          discriminacao: description,
          cnae: String(nfseConfig.cnae ?? '6201500'),
          iss: {
            aliquota: Number(nfseConfig.issAliquota ?? 2),
          },
          valor: {
            servico: Number(order.totalAmount),
          },
        },
      },
    ];
  }

  private buildNfePayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): object[] {
    const address = this.getAddress(business);

    const products = (order.items ?? []).map((item, index) => {
      const product = item.product;
      return {
        codigo: product?.sku ?? String(index + 1),
        descricao: product?.name ?? 'Produto',
        ncm: product?.ncm ?? '00000000',
        cfop: product?.cfopDefault ?? '5102',
        unidadeComercial: product?.unit ?? 'UN',
        quantidade: Number(item.qty),
        valorUnitario: Number(item.unitPrice),
        valorTotal: Number(item.qty) * Number(item.unitPrice),
        origem: Number(product?.originCode ?? 0),
        tributacao: {
          icms: { situacaoTributaria: '400' },
          pis: { situacaoTributaria: '07' },
          cofins: { situacaoTributaria: '07' },
        },
      };
    });

    return [
      {
        idIntegracao: integrationId,
        naturezaOperacao: 'Venda de mercadoria',
        emitente: {
          cpfCnpj: this.onlyDigits(business.document),
          razaoSocial: business.legalName ?? business.tradeName,
          inscricaoEstadual: business.inscricaoEstadual ?? '',
          endereco: {
            logradouro: address.logradouro || 'Endereco nao informado',
            numero: address.numero || 'S/N',
            codigoMunicipio: business.cityIbgeCode ?? undefined,
            cep: this.onlyDigits(address.cep),
            uf: address.uf || 'BA',
          },
          regimeTributario: this.mapRegime(business.taxRegime),
        },
        destinatario: order.party
          ? {
              cpfCnpj: this.onlyDigits(order.party.document) || undefined,
              razaoSocial: order.party.legalName ?? order.party.name,
              email: order.party.email ?? undefined,
            }
          : undefined,
        produtos: products,
        totalNfe: {
          valorProdutos: Number(order.totalAmount),
          valorNfe: Number(order.totalAmount),
        },
        transporte: { modalidadeFrete: 9 },
        informacoesAdicionais: `Pedido ${order.id.slice(0, 8)}`,
      },
    ];
  }

  private buildNfcePayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
    paymentMethod: FiscalPaymentMethod,
  ): object[] {
    const payment = this.mapPaymentMethod(paymentMethod);
    const technicalResponsible = this.buildTechnicalResponsible(business);

    return [
      {
        idIntegracao: integrationId,
        natureza: 'VENDA',
        emitente: {
          cpfCnpj: this.onlyDigits(business.document),
        },
        destinatario: order.party
          ? {
              cpfCnpj: this.onlyDigits(order.party.document) || undefined,
              razaoSocial: order.party.legalName ?? order.party.name,
              email: order.party.email ?? undefined,
            }
          : undefined,
        itens: (order.items ?? []).map((item, index) => {
          const product = item.product;
          const unitPrice = Number(item.unitPrice);
          const totalValue = Number(item.qty) * unitPrice;

          return {
            codigo: product?.sku ?? String(index + 1),
            descricao: product?.name ?? 'Produto',
            ncm: product?.ncm ?? '00000000',
            cfop: product?.cfopDefault ?? '5102',
            unidade: product?.unit ?? 'UN',
            quantidade: Number(item.qty),
            valorUnitario: {
              comercial: unitPrice,
              tributavel: unitPrice,
            },
            valor: totalValue,
            tributos: {
              icms: {
                origem: String(product?.originCode ?? '0'),
                cst: '00',
                baseCalculo: {
                  modalidadeDeterminacao: 0,
                  valor: 0,
                },
                aliquota: 0,
                valor: 0,
              },
              pis: {
                cst: '99',
                baseCalculo: {
                  valor: 0,
                  quantidade: 0,
                },
                aliquota: 0,
                valor: 0,
              },
              cofins: {
                cst: '07',
                baseCalculo: {
                  valor: 0,
                },
                aliquota: 0,
                valor: 0,
              },
            },
          };
        }),
        pagamentos: [
          {
            aVista: true,
            meio: payment.code,
            valor: Number(order.totalAmount),
          },
        ],
        consumidorFinal: true,
        presencaComprador: 1,
        informacoesAdicionais: `Pedido ${order.id.slice(0, 8)}`,
        ...(technicalResponsible
          ? { responsavelTecnico: technicalResponsible }
          : {}),
      },
    ];
  }

  private buildPlugnotasEmpresaPayload(business: ErpBusiness): object {
    const sandbox = this.config.get<boolean>('fiscal.sandbox', true);
    const fiscalConfig = this.getFiscalConfig(business);
    const address = this.getAddress(business);
    const documentDigits = this.onlyDigits(business.document);
    const phone = this.parsePhone(business.responsiblePhone);
    const nfseConfig = this.getNestedConfig(business, 'nfse');
    const nfeConfig = this.getNestedConfig(business, 'nfe');
    const nfceConfig = this.getNestedConfig(business, 'nfce');
    const apiHost = (process.env.API_PUBLIC_URL ?? '').trim();
    const webhookUrl = apiHost
      ? `${apiHost}/api/v1/erp/fiscal/webhook`
      : undefined;

    return {
      cpfCnpj: documentDigits,
      razaoSocial: business.legalName ?? business.tradeName,
      nomeFantasia: business.tradeName ?? business.legalName ?? undefined,
      email: business.responsibleEmail ?? undefined,
      telefone: phone
        ? {
            ddd: phone.ddd,
            numero: phone.numero,
          }
        : undefined,
      certificado:
        typeof fiscalConfig['plugnotasCertificateId'] === 'string'
          ? fiscalConfig['plugnotasCertificateId']
          : undefined,
      simplesNacional:
        business.taxRegime === 'mei' ||
        business.taxRegime === 'simples_nacional' ||
        business.taxRegime === 'simples_nacional_excesso',
      regimeTributario: this.mapRegime(business.taxRegime),
      endereco: {
        logradouro: address.logradouro || undefined,
        numero: address.numero || undefined,
        complemento: address.complemento || undefined,
        bairro: address.bairro || undefined,
        codigoPais: '1058',
        descricaoPais: 'Brasil',
        codigoCidade: business.cityIbgeCode ?? undefined,
        descricaoCidade: address.city || undefined,
        estado: address.uf || undefined,
        cep: this.onlyDigits(address.cep) || undefined,
      },
      nfse: {
        ativo: true,
        tipoContrato: 0,
        config: {
          producao: !sandbox,
          rps: {
            serie: String(nfseConfig.rpsSerie ?? 'RPS'),
            numero: Number(nfseConfig.rpsNumeroInicial ?? 1),
            lote: Number(nfseConfig.rpsLoteInicial ?? 1),
          },
          email: {
            envio: true,
          },
        },
      },
      nfe: {
        ativo: true,
        tipoContrato: 0,
        config: {
          producao: !sandbox,
          serie: Number(nfeConfig.serie ?? 1),
          numero: Number(nfeConfig.numeroInicial ?? 1),
          dfe: {
            ativo: true,
          },
          email: {
            envio: true,
          },
        },
      },
      nfce: {
        ativo: true,
        tipoContrato: 0,
        config: {
          producao: !sandbox,
          serie: Number(nfceConfig.serie ?? 1),
          numero: Number(nfceConfig.numeroInicial ?? 1),
          email: {
            envio: true,
          },
          ...(nfceConfig.cscId || nfceConfig.cscCode
            ? {
                sefaz: {
                  idCodigoSegurancaContribuinte: String(
                    nfceConfig.cscId ?? '',
                  ),
                  codigoSegurancaContribuinte: String(
                    nfceConfig.cscCode ?? '',
                  ),
                },
              }
            : {}),
        },
      },
      config: {
        producao: !sandbox,
        ...(webhookUrl ? { webhook: webhookUrl } : {}),
      },
    };
  }

  private async ensureEmpresaRegistered(business: ErpBusiness): Promise<void> {
    const fiscalConfig = this.getFiscalConfig(business);
    if (fiscalConfig['plugnotasRegistered']) {
      return;
    }

    const documentDigits = this.onlyDigits(business.document);
    if (documentDigits.length !== 11 && documentDigits.length !== 14) {
      return;
    }

    try {
      await this.plugnotas.registerEmpresa(
        this.buildPlugnotasEmpresaPayload(business),
      );
    } catch (error) {
      this.logger.warn(
        `Nao foi possivel registrar emitente ${business.id} no PlugNotas: ${(error as Error).message}`,
      );
      return;
    }

    const nextFiscalConfig = {
      ...fiscalConfig,
      plugnotasRegistered: true,
    };
    await this.businesses.update(business.id, { fiscalConfig: nextFiscalConfig });
    business.fiscalConfig = nextFiscalConfig;
  }

  private getFiscalConfig(
    business: ErpBusiness,
  ): Record<string, unknown> {
    return (business.fiscalConfig ?? {}) as Record<string, unknown>;
  }

  private getNestedConfig(
    business: ErpBusiness,
    key: 'nfse' | 'nfe' | 'nfce',
  ): Record<string, unknown> {
    return (this.getFiscalConfig(business)[key] ?? {}) as Record<string, unknown>;
  }

  private getAddress(
    business: ErpBusiness,
  ): Record<string, string> {
    return (business.address ?? {}) as Record<string, string>;
  }

  private onlyDigits(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '');
  }

  private mapRegime(regime: string | null): number {
    switch (regime) {
      case 'simples_nacional':
        return 1;
      case 'simples_nacional_excesso':
        return 2;
      case 'lucro_presumido':
      case 'lucro_real':
        return 3;
      case 'mei':
        return 1;
      default:
        return 1;
    }
  }

  private mapPaymentMethod(
    method: FiscalPaymentMethod,
  ): { code: string; label: string } {
    switch (method) {
      case 'cash':
        return { code: '01', label: 'Dinheiro' };
      case 'credit_card':
        return { code: '03', label: 'Cartao de credito' };
      case 'debit_card':
        return { code: '04', label: 'Cartao de debito' };
      case 'pix':
        return { code: '17', label: 'PIX' };
      default:
        return { code: '99', label: 'Outros' };
    }
  }

  private parsePhone(
    rawPhone: string | null | undefined,
  ): { ddd: string; numero: string } | null {
    const digits = this.onlyDigits(rawPhone);
    if (digits.length < 10) {
      return null;
    }
    return {
      ddd: digits.slice(0, 2),
      numero: digits.slice(2),
    };
  }

  private buildTechnicalResponsible(
    business: ErpBusiness,
  ): Record<string, unknown> | null {
    const phone = this.parsePhone(business.responsiblePhone);
    if (
      !business.responsibleName ||
      !business.responsibleEmail ||
      !phone ||
      !business.document
    ) {
      return null;
    }

    return {
      cpfCnpj: this.onlyDigits(business.document),
      nome: business.responsibleName,
      email: business.responsibleEmail,
      telefone: {
        ddd: phone.ddd,
        numero: phone.numero,
      },
    };
  }

  private describeError(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (response && typeof response === 'object' && 'message' in response) {
        const message = (response as { message?: unknown }).message;
        if (Array.isArray(message)) {
          return message.map(String).join('; ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'Erro nao identificado.';
  }
}
