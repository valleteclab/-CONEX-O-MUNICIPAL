import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import {
  parseFiscalDocument,
  supportsCurrentPlugNotasDocument,
} from '../../common/fiscal-document';
import { ErpAccountReceivable } from '../../entities/erp-account-receivable.entity';
import { ErpBusiness } from '../../entities/erp-business.entity';
import {
  ErpFiscalDocument,
} from '../../entities/erp-fiscal-document.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpStockMovement } from '../../entities/erp-stock-movement.entity';
import {
  CancelFiscalDocumentDto,
  CreateFiscalReturnDto,
  EmitFiscalDto,
  FiscalDocumentType,
  FiscalPaymentMethod,
  SendCceDto,
} from '../dto/fiscal.dto';
import { dec } from '../utils/decimal';
import {
  PlugNotasDocumentResponse,
  PlugNotasService,
} from './plugnotas.service';

type ReturnSnapshotItem = {
  productId: string;
  qty: string;
  unitPrice: string;
  totalAmount: string;
};

export type FiscalReadinessCheck = {
  id: string;
  ok: boolean;
  message: string;
  section: 'emitente' | 'destinatario' | 'itens';
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

function mapOrderFiscalStatus(
  status: ErpFiscalDocument['status'],
): ErpSalesOrder['fiscalStatus'] {
  switch (status) {
    case 'authorized':
      return 'authorized';
    case 'cancelled':
      return 'cancelled';
    case 'error':
    case 'rejected':
      return 'error';
    case 'pending':
    case 'processing':
    default:
      return 'pending';
  }
}

@Injectable()
export class ErpFiscalService {
  private readonly logger = new Logger(ErpFiscalService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ErpFiscalDocument)
    private readonly docs: Repository<ErpFiscalDocument>,
    @InjectRepository(ErpSalesOrder)
    private readonly orders: Repository<ErpSalesOrder>,
    @InjectRepository(ErpBusiness)
    private readonly businesses: Repository<ErpBusiness>,
    @InjectRepository(ErpStockLocation)
    private readonly locations: Repository<ErpStockLocation>,
    @InjectRepository(ErpStockBalance)
    private readonly balances: Repository<ErpStockBalance>,
    @InjectRepository(ErpStockMovement)
    private readonly movements: Repository<ErpStockMovement>,
    @InjectRepository(ErpAccountReceivable)
    private readonly receivables: Repository<ErpAccountReceivable>,
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
      relations: ['salesOrder', 'relatedDocument'],
    });
    return { items, total };
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpFiscalDocument> {
    const doc = await this.docs.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: ['salesOrder', 'relatedDocument'],
    });
    if (!doc) {
      throw new NotFoundException('Documento fiscal nao encontrado');
    }
    return doc;
  }

  async findActiveSalesDocument(
    business: ErpBusiness,
    salesOrderId: string,
  ): Promise<ErpFiscalDocument | null> {
    return this.docs.findOne({
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        salesOrderId,
        purpose: 'sale',
      },
      order: { createdAt: 'DESC' },
    });
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

    this.getRequiredPlugNotasDocument(
      business.document,
      'Informe CNPJ ou CPF valido do negocio antes de registrar no PlugNotas.',
      'CNPJ alfanumerico ainda nao pode ser sincronizado no PlugNotas com o contrato atual. Cadastre o documento internamente e conclua a emissao fiscal apos a atualizacao do provedor.',
    );
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

  async getEmitReadiness(
    business: ErpBusiness,
    type: FiscalDocumentType,
    orderId?: string,
  ): Promise<FiscalReadinessPayload> {
    const sandbox = this.config.get<boolean>('fiscal.sandbox', true);
    const checks = this.buildBusinessChecks(business, type);

    if (orderId) {
      const order = await this.orders.findOne({
        where: {
          id: orderId,
          businessId: business.id,
          tenantId: business.tenantId,
        },
        relations: ['items', 'items.product', 'party'],
      });
      if (order) {
        checks.push(...this.buildOrderChecks(order, type));
      }
    }

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
        purpose: 'sale',
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (
      existing &&
      existing.status !== 'error' &&
      existing.status !== 'rejected' &&
      existing.status !== 'cancelled'
    ) {
      throw new BadRequestException(
        `Já existe um documento ${dto.type.toUpperCase()} para este pedido (status: ${existing.status}).`,
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

    order.fiscalStatus = 'pending';
    order.fiscalDocumentType = dto.type;
    await this.orders.save(order);

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
      errDoc.purpose = 'sale';
      errDoc.idIntegracao = integrationId;
      errDoc.status = 'error';
      errDoc.errorMessage = (error as Error).message;
      await this.docs.save(errDoc);
      order.fiscalStatus = 'error';
      order.fiscalDocumentType = dto.type;
      await this.orders.save(order);
      throw error;
    }

    const doc = existing ?? this.docs.create();
    doc.tenantId = business.tenantId;
    doc.businessId = business.id;
    doc.salesOrderId = order.id;
    doc.type = dto.type;
    doc.purpose = 'sale';
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
    const savedDoc = await this.docs.save(doc);
    order.fiscalStatus = mapOrderFiscalStatus(savedDoc.status);
    order.fiscalDocumentType = savedDoc.type;
    await this.orders.save(order);
    return savedDoc;
  }

  async createReturnFromOrder(
    business: ErpBusiness,
    dto: CreateFiscalReturnDto,
  ): Promise<ErpFiscalDocument> {
    const originalDoc = await this.findOne(business, dto.originalFiscalDocumentId);
    if (originalDoc.purpose !== 'sale') {
      throw new BadRequestException(
        'A devolucao deve referenciar um documento fiscal original de venda.',
      );
    }
    if (originalDoc.salesOrderId !== dto.salesOrderId) {
      throw new BadRequestException(
        'Documento fiscal e pedido informados nao pertencem a mesma venda.',
      );
    }
    if (originalDoc.type === 'nfse') {
      throw new BadRequestException(
        'NFS-e nao possui fluxo de devolucao fiscal nesta fase.',
      );
    }
    if (originalDoc.status !== 'authorized') {
      throw new BadRequestException(
        'Somente documento fiscal autorizado pode gerar devolucao.',
      );
    }

    const order = await this.orders.findOne({
      where: {
        id: dto.salesOrderId,
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
        'Somente vendas confirmadas podem gerar nota de devolucao.',
      );
    }

    const requestedItems = dto.items.map((item) => {
      const orderItem = order.items.find((line) => line.productId === item.productId);
      if (!orderItem) {
        throw new BadRequestException(
          `Produto ${item.productId} nao pertence a esta venda.`,
        );
      }
      const requestedQty = Number(item.qty);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        throw new BadRequestException('Quantidade de devolucao invalida.');
      }
      return { dtoItem: item, orderItem };
    });

    const priorReturns = await this.docs.find({
      where: {
        tenantId: business.tenantId,
        businessId: business.id,
        purpose: 'return',
        relatedDocumentId: originalDoc.id,
      },
    });
    const alreadyReturned = new Map<string, number>();
    for (const prior of priorReturns) {
      if (!['authorized', 'processing', 'pending'].includes(prior.status)) {
        continue;
      }
      const snapshot = this.getReturnSnapshot(prior);
      for (const item of snapshot.items) {
        alreadyReturned.set(
          item.productId,
          (alreadyReturned.get(item.productId) ?? 0) + Number(item.qty),
        );
      }
    }

    const snapshotItems: ReturnSnapshotItem[] = requestedItems.map(({ dtoItem, orderItem }) => {
      const soldQty = Number(orderItem.qty);
      const requestedQty = Number(dtoItem.qty);
      const priorQty = alreadyReturned.get(orderItem.productId) ?? 0;
      if (requestedQty + priorQty > soldQty + 0.0001) {
        throw new BadRequestException(
          `A devolucao do item ${orderItem.product?.name ?? orderItem.productId} ultrapassa a quantidade vendida.`,
        );
      }
      const unitPrice = Number(orderItem.unitPrice);
      return {
        productId: orderItem.productId,
        qty: dec(requestedQty),
        unitPrice: dec(unitPrice),
        totalAmount: dec(requestedQty * unitPrice),
      };
    });

    const totalAmount = snapshotItems.reduce(
      (sum, item) => sum + Number(item.totalAmount),
      0,
    );
    const integrationId = `${order.id}-${originalDoc.type}-return-${Date.now()}`;
    await this.ensureEmpresaRegistered(business);

    let remote: PlugNotasDocumentResponse;
    try {
      if (originalDoc.type === 'nfce') {
        remote = (
          await this.plugnotas.emitNfce(
            this.buildNfceReturnPayload(
              business,
              order,
              originalDoc,
              snapshotItems,
              integrationId,
            ),
          )
        )[0];
      } else {
        remote = (
          await this.plugnotas.emitNfe(
            this.buildNfeReturnPayload(
              business,
              order,
              originalDoc,
              snapshotItems,
              integrationId,
            ),
          )
        )[0];
      }
    } catch (error) {
      const errDoc = this.docs.create({
        tenantId: business.tenantId,
        businessId: business.id,
        salesOrderId: order.id,
        type: originalDoc.type,
        purpose: 'return',
        relatedDocumentId: originalDoc.id,
        relatedAccessKey: originalDoc.chave,
        idIntegracao: integrationId,
        status: 'error',
        operationSnapshot: {
          items: snapshotItems,
          totalAmount: dec(totalAmount),
          note: dto.note?.trim() || null,
        },
        errorMessage: (error as Error).message,
      });
      await this.docs.save(errDoc);
      throw error;
    }

    const returnDoc = this.docs.create({
      tenantId: business.tenantId,
      businessId: business.id,
      salesOrderId: order.id,
      type: originalDoc.type,
      purpose: 'return',
      relatedDocumentId: originalDoc.id,
      relatedAccessKey: originalDoc.chave,
      plugnotasId: remote.id ?? null,
      idIntegracao: remote.idIntegracao ?? integrationId,
      status: normalizeStatus(remote.status ?? 'processing'),
      numero: remote.numero ?? null,
      serie: remote.serie ?? null,
      chave: remote.chave ?? null,
      xmlUrl: remote.xml ?? null,
      pdfUrl: remote.pdf ?? null,
      rawResponse: remote as unknown as object,
      operationSnapshot: {
        items: snapshotItems,
        totalAmount: dec(totalAmount),
        note: dto.note?.trim() || null,
      },
      emittedAt: new Date(),
      errorMessage: null,
    });
    const savedDoc = await this.docs.save(returnDoc);
    await this.applyAuthorizedReturnEffects(savedDoc);
    return this.findOne(business, savedDoc.id);
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
    if (doc.status === 'cancelled' && !doc.cancelAuthorizedAt) {
      doc.cancelAuthorizedAt = new Date();
    }
    const savedDoc = await this.docs.save(doc);
    await this.syncOrderFiscalStatus(savedDoc);
    await this.applyAuthorizedReturnEffects(savedDoc);
    return savedDoc;
  }

  async cancel(
    business: ErpBusiness,
    docId: string,
    dto: CancelFiscalDocumentDto,
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
    const reason = dto.reason?.trim();
    if (!reason) {
      throw new BadRequestException('Informe o motivo do cancelamento fiscal.');
    }

    doc.cancelReason = reason;
    doc.cancelRequestedAt = new Date();
    await this.docs.save(doc);

    let providerPayload: unknown;
    try {
      providerPayload = await this.plugnotas.cancel(doc.type, doc.plugnotasId, {
        justificativa: reason,
      });
    } catch (error) {
      doc.providerEventPayload = {
        ...(doc.providerEventPayload ?? {}),
        cancelError: this.describeError(error),
        cancelReason: reason,
      };
      await this.docs.save(doc);
      throw error;
    }

    doc.status = 'cancelled';
    doc.cancelAuthorizedAt = new Date();
    doc.providerEventPayload = {
      ...(doc.providerEventPayload ?? {}),
      cancelResponse: providerPayload ?? null,
      cancelReason: reason,
    };
    const savedDoc = await this.docs.save(doc);
    await this.syncOrderFiscalStatus(savedDoc);
    return savedDoc;
  }

  async sendCce(
    business: ErpBusiness,
    docId: string,
    dto: SendCceDto,
  ): Promise<{ response: unknown }> {
    const doc = await this.findOne(business, docId);

    if (doc.type !== 'nfe') {
      throw new BadRequestException(
        'Carta de Correção Eletrônica é exclusiva para NF-e.',
      );
    }
    if (doc.status !== 'authorized') {
      throw new BadRequestException(
        'CC-e só pode ser enviada para NF-e com status autorizado.',
      );
    }
    if (!doc.plugnotasId) {
      throw new BadRequestException('Documento sem ID PlugNotas.');
    }

    const correcao = dto.correcao?.trim();
    if (!correcao || correcao.length < 15) {
      throw new BadRequestException(
        'O texto da correção deve ter no mínimo 15 caracteres (exigência SEFAZ).',
      );
    }

    const response = await this.plugnotas.sendCce(doc.plugnotasId, correcao);

    doc.providerEventPayload = {
      ...(doc.providerEventPayload ?? {}),
      cceResponse: response ?? null,
      cceAt: new Date().toISOString(),
    };
    await this.docs.save(doc);

    return { response };
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
    if (doc.status === 'cancelled' && !doc.cancelAuthorizedAt) {
      doc.cancelAuthorizedAt = new Date();
    }
    await this.docs.save(doc);
    await this.syncOrderFiscalStatus(doc);
    await this.applyAuthorizedReturnEffects(doc);

    this.logger.log(
      `Webhook PlugNotas: documento ${doc.id} atualizado para ${doc.status}.`,
    );
  }

  private async syncOrderFiscalStatus(doc: ErpFiscalDocument): Promise<void> {
    if (!doc.salesOrderId || doc.purpose !== 'sale') {
      return;
    }

    const order = await this.orders.findOne({
      where: {
        id: doc.salesOrderId,
        tenantId: doc.tenantId,
        businessId: doc.businessId,
      },
    });
    if (!order) {
      return;
    }

    order.fiscalStatus = mapOrderFiscalStatus(doc.status);
    order.fiscalDocumentType = doc.type;
    await this.orders.save(order);
  }

  private async applyAuthorizedReturnEffects(
    doc: ErpFiscalDocument,
  ): Promise<void> {
    if (
      doc.purpose !== 'return' ||
      doc.status !== 'authorized' ||
      doc.effectAppliedAt ||
      !doc.salesOrderId
    ) {
      return;
    }

    await this.dataSource.transaction(async (em) => {
      const freshDoc = await em.findOne(ErpFiscalDocument, {
        where: { id: doc.id, tenantId: doc.tenantId, businessId: doc.businessId },
      });
      if (!freshDoc || freshDoc.effectAppliedAt || freshDoc.status !== 'authorized') {
        return;
      }

      const order = await em.findOne(ErpSalesOrder, {
        where: {
          id: freshDoc.salesOrderId!,
          tenantId: doc.tenantId,
          businessId: doc.businessId,
        },
        relations: ['items', 'items.product'],
      });
      if (!order) {
        return;
      }

      const defaultLocation = await em.findOne(ErpStockLocation, {
        where: {
          tenantId: doc.tenantId,
          businessId: doc.businessId,
          isDefault: true,
        },
      });
      if (!defaultLocation) {
        throw new BadRequestException(
          'Defina um local de estoque padrao antes de processar a devolucao.',
        );
      }

      const snapshot = this.getReturnSnapshot(freshDoc);
      for (const item of snapshot.items) {
        let balance = await em.findOne(ErpStockBalance, {
          where: {
            tenantId: doc.tenantId,
            businessId: doc.businessId,
            productId: item.productId,
            locationId: defaultLocation.id,
          },
        });
        const current = balance ? parseFloat(balance.quantity) : 0;
        const next = current + Number(item.qty);

        await em.save(
          em.create(ErpStockMovement, {
            tenantId: doc.tenantId,
            businessId: doc.businessId,
            type: 'in',
            productId: item.productId,
            locationId: defaultLocation.id,
            quantity: dec(item.qty),
            refType: 'fiscal_return',
            refId: freshDoc.id,
            userId: null,
            note: `Entrada por devolucao fiscal ${freshDoc.id}`,
          }),
        );

        if (!balance) {
          balance = em.create(ErpStockBalance, {
            tenantId: doc.tenantId,
            businessId: doc.businessId,
            productId: item.productId,
            locationId: defaultLocation.id,
            quantity: dec(next),
          });
        } else {
          balance.quantity = dec(next);
        }
        await em.save(balance);
      }

      const receivable = await em.findOne(ErpAccountReceivable, {
        where: {
          tenantId: doc.tenantId,
          businessId: doc.businessId,
          linkRef: 'sales_order',
          linkId: order.id,
        },
      });
      if (receivable && receivable.status === 'open') {
        const remaining = parseFloat(receivable.amount) - Number(snapshot.totalAmount);
        if (remaining <= 0.0001) {
          receivable.amount = dec(0);
          receivable.status = 'cancelled';
        } else {
          receivable.amount = dec(remaining);
        }
        receivable.note = `${receivable.note ?? ''}\nAjustado pela devolucao fiscal ${freshDoc.id}.`
          .trim();
        await em.save(receivable);
      }

      const allReturnDocs = await em.find(ErpFiscalDocument, {
        where: {
          tenantId: doc.tenantId,
          businessId: doc.businessId,
          purpose: 'return',
          salesOrderId: order.id,
        },
      });
      const returnedMap = new Map<string, number>();
      for (const returnDoc of allReturnDocs) {
        if (returnDoc.status !== 'authorized') continue;
        const returnSnapshot = this.getReturnSnapshot(returnDoc);
        for (const item of returnSnapshot.items) {
          returnedMap.set(
            item.productId,
            (returnedMap.get(item.productId) ?? 0) + Number(item.qty),
          );
        }
      }

      const fullReturn = order.items.every((item) => {
        if (item.product?.kind === 'service') {
          return true;
        }
        return (returnedMap.get(item.productId) ?? 0) >= Number(item.qty) - 0.0001;
      });
      order.commercialStatus = fullReturn ? 'returned_full' : 'returned_partial';
      await em.save(order);

      freshDoc.effectAppliedAt = new Date();
      await em.save(freshDoc);
    });
  }

  private getReturnSnapshot(doc: ErpFiscalDocument): {
    items: ReturnSnapshotItem[];
    totalAmount: string;
  } {
    const snapshot = (doc.operationSnapshot ?? {}) as {
      items?: ReturnSnapshotItem[];
      totalAmount?: string;
    };
    return {
      items: Array.isArray(snapshot.items) ? snapshot.items : [],
      totalAmount: typeof snapshot.totalAmount === 'string' ? snapshot.totalAmount : '0',
    };
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
      const partyDocument = parseFiscalDocument(order.party.document);
      if (partyDocument.normalized) {
        if (!partyDocument.isValid) {
          errors.push(
            'Cliente do pedido com CPF ou CNPJ invalido; atualize o cadastro antes de emitir.',
          );
        } else if (!supportsCurrentPlugNotasDocument(partyDocument.normalized)) {
          errors.push(
            'Cliente do pedido com CNPJ alfanumerico. A emissao fiscal ainda depende de provedor externo que aceita apenas CPF e CNPJ numerico.',
          );
        }
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
    const document = parseFiscalDocument(business.document);
    const plugNotasSupportsDocument =
      document.isValid && supportsCurrentPlugNotasDocument(document.normalized);
    const legalName = (business.legalName ?? business.tradeName ?? '').trim();
    const address = this.getAddress(business);
    const cep = this.onlyDigits(address.cep);
    const ibgeCode = this.getBusinessCityIbgeCode(business);
    const fiscalConfig = this.getFiscalConfig(business);

    checks.push({
      id: 'emitente_documento',
      section: 'emitente',
      ok: plugNotasSupportsDocument,
      message:
        plugNotasSupportsDocument
          ? 'Documento do emitente preenchido.'
          : document.kind === 'cnpj_alphanumeric'
            ? 'CNPJ alfanumerico salvo, mas a emissao ainda depende de provedor que aceita apenas CPF e CNPJ numerico.'
            : 'Informe CPF ou CNPJ valido do emitente.',
    });
    checks.push({
      id: 'emitente_razao',
      section: 'emitente',
      ok: legalName.length >= 2,
      message:
        legalName.length >= 2
          ? 'Razao social ou nome fantasia preenchido.'
          : 'Informe razao social ou nome fantasia do negocio.',
    });
    checks.push({
      id: 'emitente_logradouro',
      section: 'emitente',
      ok: address.logradouro.length >= 3,
      message:
        address.logradouro.length >= 3
          ? 'Logradouro do emitente preenchido.'
          : 'Preencha o logradouro do endereco do emitente.',
    });
    checks.push({
      id: 'emitente_numero',
      section: 'emitente',
      ok: address.numero.length >= 1,
      message:
        address.numero.length >= 1
          ? 'Numero do endereco preenchido.'
          : 'Preencha o numero do endereco do emitente.',
    });
    checks.push({
      id: 'emitente_cep',
      section: 'emitente',
      ok: cep.length === 8,
      message:
        cep.length === 8
          ? 'CEP do emitente valido.'
          : 'CEP do emitente deve ter 8 digitos.',
    });
    checks.push({
      id: 'emitente_ibge',
      section: 'emitente',
      ok: /^\d{7}$/.test(ibgeCode),
      message: /^\d{7}$/.test(ibgeCode)
        ? 'Codigo IBGE do municipio informado.'
        : 'Informe o codigo IBGE de 7 digitos do municipio do emitente.',
    });
    checks.push({
      id: 'plugnotas_certificado',
      section: 'emitente',
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
        section: 'emitente',
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
      section: 'emitente',
      ok: uf.length === 2,
      message:
        uf.length === 2
          ? 'UF do emitente informada.'
          : 'Informe a UF do emitente para documentos de mercadoria.',
    });
    checks.push({
      id: 'comercial_ie',
      section: 'emitente',
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
        section: 'emitente',
        ok: cscId.length >= 1,
        message:
          cscId.length >= 1
            ? 'Identificador CSC configurado.'
            : 'Informe o identificador CSC da NFC-e em Dados Fiscais.',
      });
      checks.push({
        id: 'nfce_csc_code',
        section: 'emitente',
        ok: cscCode.length >= 6,
        message:
          cscCode.length >= 6
            ? 'Codigo CSC configurado.'
            : 'Informe o codigo CSC da NFC-e em Dados Fiscais.',
      });
    }

    return checks;
  }

  private buildOrderChecks(
    order: ErpSalesOrder,
    type: FiscalDocumentType,
  ): FiscalReadinessCheck[] {
    const checks: FiscalReadinessCheck[] = [];

    // --- Destinatário ---
    const party = order.party;
    const partyName = (party?.legalName ?? party?.name ?? '').trim();
    checks.push({
      id: 'destinatario_nome',
      section: 'destinatario',
      ok: partyName.length >= 2,
      message:
        partyName.length >= 2
          ? `Destinatario identificado: ${partyName}.`
          : 'Pedido sem cliente vinculado. Para NF-e, o destinatario pode ser omitido somente em venda a consumidor final.',
    });

    if (party?.document) {
      const partyDoc = parseFiscalDocument(party.document);
      checks.push({
        id: 'destinatario_documento',
        section: 'destinatario',
        ok: partyDoc.isValid,
        message: partyDoc.isValid
          ? `Documento do destinatario valido (${partyDoc.kind}).`
          : 'Documento (CPF/CNPJ) do cliente invalido; corrija antes de emitir.',
      });
    }

    // --- Itens ---
    const items = order.items ?? [];
    if (items.length === 0) {
      checks.push({
        id: 'itens_existem',
        section: 'itens',
        ok: false,
        message: 'O pedido nao possui itens.',
      });
    } else {
      checks.push({
        id: 'itens_existem',
        section: 'itens',
        ok: true,
        message: `${items.length} item(ns) no pedido.`,
      });
    }

    if (type !== 'nfse') {
      for (const item of items) {
        const product = item.product;
        const name = product?.name ?? item.productId;
        const ncm = this.onlyDigits(product?.ncm);
        checks.push({
          id: `item_ncm_${item.productId}`,
          section: 'itens',
          ok: ncm.length === 8,
          message:
            ncm.length === 8
              ? `"${name}" — NCM ${product!.ncm} preenchido.`
              : `"${name}" — NCM ausente ou invalido (precisa ter 8 digitos).`,
        });
        const cfop = (product?.cfopDefault ?? '').trim();
        checks.push({
          id: `item_cfop_${item.productId}`,
          section: 'itens',
          ok: /^\d{4}$/.test(cfop),
          message:
            /^\d{4}$/.test(cfop)
              ? `"${name}" — CFOP ${cfop} configurado.`
              : `"${name}" — CFOP ausente; sera usado 5102 como padrao.`,
        });
      }
    }

    return checks;
  }

  private buildNfsePayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): object[] {
    const address = this.getAddress(business);
    const cityIbgeCode = this.getBusinessCityIbgeCode(business);
    const nfseConfig = this.getNestedConfig(business, 'nfse');
    const description = order.items
      .map((item) => `${item.product?.name ?? item.productId} (${item.qty})`)
      .join('; ');

    return [
      {
        idIntegracao: integrationId,
        prestador: {
          cpfCnpj: this.getRequiredPlugNotasDocument(business.document),
          inscricaoMunicipal: business.inscricaoMunicipal ?? '',
          razaoSocial: business.legalName ?? business.tradeName,
          endereco: {
            logradouro: address.logradouro || 'Endereco nao informado',
            numero: address.numero || 'S/N',
            complemento: address.complemento || undefined,
            bairro: address.bairro || undefined,
            codigoMunicipio: cityIbgeCode || undefined,
            cep: this.onlyDigits(address.cep),
          },
        },
        tomador: order.party
          ? {
              cpfCnpj: this.getOptionalPlugNotasDocument(order.party.document),
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
    const cityIbgeCode = this.getBusinessCityIbgeCode(business);

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
          cpfCnpj: this.getRequiredPlugNotasDocument(business.document),
          razaoSocial: business.legalName ?? business.tradeName,
          inscricaoEstadual: business.inscricaoEstadual ?? '',
          endereco: {
            logradouro: address.logradouro || 'Endereco nao informado',
            numero: address.numero || 'S/N',
            codigoMunicipio: cityIbgeCode || undefined,
            cep: this.onlyDigits(address.cep),
            uf: address.uf || 'BA',
          },
          regimeTributario: this.mapRegime(business.taxRegime),
        },
        destinatario: order.party
          ? {
              cpfCnpj: this.getOptionalPlugNotasDocument(order.party.document),
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

  private buildNfeReturnPayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
    originalDoc: ErpFiscalDocument,
    items: ReturnSnapshotItem[],
    integrationId: string,
  ): object[] {
    const address = this.getAddress(business);
    const cityIbgeCode = this.getBusinessCityIbgeCode(business);
    return [
      {
        idIntegracao: integrationId,
        naturezaOperacao: 'Devolucao de mercadoria',
        finalidade: 4,
        emitente: {
          cpfCnpj: this.getRequiredPlugNotasDocument(business.document),
          razaoSocial: business.legalName ?? business.tradeName,
          inscricaoEstadual: business.inscricaoEstadual ?? '',
          endereco: {
            logradouro: address.logradouro || 'Endereco nao informado',
            numero: address.numero || 'S/N',
            codigoMunicipio: cityIbgeCode || undefined,
            cep: this.onlyDigits(address.cep),
            uf: address.uf || 'BA',
          },
          regimeTributario: this.mapRegime(business.taxRegime),
        },
        destinatario: order.party
          ? {
              cpfCnpj: this.getOptionalPlugNotasDocument(order.party.document),
              razaoSocial: order.party.legalName ?? order.party.name,
              email: order.party.email ?? undefined,
            }
          : undefined,
        produtos: items.map((item, index) => {
          const originalItem = order.items.find((line) => line.productId === item.productId);
          const product = originalItem?.product;
          return {
            codigo: product?.sku ?? String(index + 1),
            descricao: product?.name ?? 'Produto',
            ncm: product?.ncm ?? '00000000',
            cfop: product?.cfopDefault ?? '1202',
            unidadeComercial: product?.unit ?? 'UN',
            quantidade: Number(item.qty),
            valorUnitario: Number(item.unitPrice),
            valorTotal: Number(item.totalAmount),
            origem: Number(product?.originCode ?? 0),
            tributacao: {
              icms: { situacaoTributaria: '400' },
              pis: { situacaoTributaria: '07' },
              cofins: { situacaoTributaria: '07' },
            },
          };
        }),
        documentoReferenciado: {
          chaveAcesso: originalDoc.chave ?? originalDoc.relatedAccessKey ?? undefined,
        },
        totalNfe: {
          valorProdutos: items.reduce((sum, item) => sum + Number(item.totalAmount), 0),
          valorNfe: items.reduce((sum, item) => sum + Number(item.totalAmount), 0),
        },
        transporte: { modalidadeFrete: 9 },
        informacoesAdicionais: `Devolucao da nota ${originalDoc.numero ?? originalDoc.id.slice(0, 8)}`,
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
          cpfCnpj: this.getRequiredPlugNotasDocument(business.document),
        },
        destinatario: order.party
          ? {
              cpfCnpj: this.getOptionalPlugNotasDocument(order.party.document),
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

  private buildNfceReturnPayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
    originalDoc: ErpFiscalDocument,
    items: ReturnSnapshotItem[],
    integrationId: string,
  ): object[] {
    const technicalResponsible = this.buildTechnicalResponsible(business);
    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
    return [
      {
        idIntegracao: integrationId,
        natureza: 'DEVOLUCAO',
        finalidade: 4,
        emitente: {
          cpfCnpj: this.getRequiredPlugNotasDocument(business.document),
        },
        destinatario: order.party
          ? {
              cpfCnpj: this.getOptionalPlugNotasDocument(order.party.document),
              razaoSocial: order.party.legalName ?? order.party.name,
              email: order.party.email ?? undefined,
            }
          : undefined,
        itens: items.map((item, index) => {
          const originalItem = order.items.find((line) => line.productId === item.productId);
          const product = originalItem?.product;
          const unitPrice = Number(item.unitPrice);
          return {
            codigo: product?.sku ?? String(index + 1),
            descricao: product?.name ?? 'Produto',
            ncm: product?.ncm ?? '00000000',
            cfop: product?.cfopDefault ?? '1202',
            unidade: product?.unit ?? 'UN',
            quantidade: Number(item.qty),
            valorUnitario: {
              comercial: unitPrice,
              tributavel: unitPrice,
            },
            valor: Number(item.totalAmount),
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
            meio: '99',
            valor: totalAmount,
          },
        ],
        consumidorFinal: true,
        presencaComprador: 1,
        documentoReferenciado: {
          chaveAcesso: originalDoc.chave ?? originalDoc.relatedAccessKey ?? undefined,
        },
        informacoesAdicionais: `Devolucao da nota ${originalDoc.numero ?? originalDoc.id.slice(0, 8)}`,
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
    const cityIbgeCode = this.getBusinessCityIbgeCode(business);
    const documentDigits = this.getRequiredPlugNotasDocument(business.document);
    const phone = this.parsePhone(business.responsiblePhone);
    const nfseConfig = this.getNestedConfig(business, 'nfse');
    const nfeConfig = this.getNestedConfig(business, 'nfe');
    const nfceConfig = this.getNestedConfig(business, 'nfce');
    const inscricaoMunicipal = (business.inscricaoMunicipal ?? '').trim();
    const inscricaoEstadual = (business.inscricaoEstadual ?? '').trim();
    const nfceCscId = String(nfceConfig.cscId ?? '').trim();
    const nfceCscCode = String(nfceConfig.cscCode ?? '').trim();
    const hasNfseConfig = inscricaoMunicipal.length > 0;
    const hasNfceConfig = nfceCscId.length > 0 && nfceCscCode.length > 0;
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
      inscricaoMunicipal: inscricaoMunicipal || undefined,
      inscricaoEstadual: inscricaoEstadual || undefined,
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
        codigoCidade: cityIbgeCode || undefined,
        descricaoCidade: address.city || undefined,
        estado: address.uf || undefined,
        cep: this.onlyDigits(address.cep) || undefined,
      },
      nfse: {
        ativo: hasNfseConfig,
        tipoContrato: 0,
        config: {
          producao: !sandbox,
          rps: {
            serie: String(nfseConfig.rpsSerie ?? 'RPS'),
            numero: Number(nfseConfig.rpsNumeroInicial ?? 1),
            lote: Number(nfseConfig.rpsLoteInicial ?? 1),
          },
          ...(hasNfseConfig
            ? {
                prefeitura: {
                  inscricaoMunicipal,
                },
              }
            : {}),
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
        ativo: hasNfceConfig,
        tipoContrato: 0,
        config: {
          producao: !sandbox,
          serie: Number(nfceConfig.serie ?? 1),
          numero: Number(nfceConfig.numeroInicial ?? 1),
          email: {
            envio: true,
          },
          ...(hasNfceConfig
            ? {
                versaoQrCode: 2,
                sefaz: {
                  idCodigoSegurancaContribuinte: nfceCscId,
                  codigoSegurancaContribuinte: nfceCscCode,
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

    const document = parseFiscalDocument(business.document);
    if (
      !document.isValid ||
      !supportsCurrentPlugNotasDocument(document.normalized)
    ) {
      return;
    }

    if (
      typeof fiscalConfig['plugnotasCertificateId'] !== 'string' ||
      !String(fiscalConfig['plugnotasCertificateId']).trim()
    ) {
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
    return this.asRecord(business.fiscalConfig);
  }

  private getNestedConfig(
    business: ErpBusiness,
    key: 'nfse' | 'nfe' | 'nfce',
  ): Record<string, unknown> {
    return this.asRecord(this.getFiscalConfig(business)[key]);
  }

  private getAddress(
    business: ErpBusiness,
  ): Record<string, string> {
    return this.asRecord(business.address) as Record<string, string>;
  }

  private getBusinessCityIbgeCode(business: ErpBusiness): string {
    const primary = (business.cityIbgeCode ?? '').trim();
    if (primary) {
      return primary;
    }
    const address = this.getAddress(business);
    return String(address.cityIbgeCode ?? '').trim();
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private onlyDigits(value: string | null | undefined): string {
    return (value ?? '').replace(/\D/g, '');
  }

  private getOptionalPlugNotasDocument(
    value: string | null | undefined,
  ): string | undefined {
    const parsed = parseFiscalDocument(value);
    if (!parsed.isValid || !supportsCurrentPlugNotasDocument(parsed.normalized)) {
      return undefined;
    }
    return this.onlyDigits(parsed.normalized) || undefined;
  }

  private getRequiredPlugNotasDocument(
    value: string | null | undefined,
    invalidMessage = 'Informe CPF ou CNPJ valido do emitente.',
    unsupportedMessage = 'CNPJ alfanumerico ainda nao e suportado pelo provedor fiscal atual.',
  ): string {
    const parsed = parseFiscalDocument(value);
    if (!parsed.isValid) {
      throw new BadRequestException(invalidMessage);
    }
    if (!supportsCurrentPlugNotasDocument(parsed.normalized)) {
      throw new BadRequestException(unsupportedMessage);
    }
    return this.onlyDigits(parsed.normalized);
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
    const document = this.getOptionalPlugNotasDocument(business.document);
    if (
      !business.responsibleName ||
      !business.responsibleEmail ||
      !phone ||
      !document
    ) {
      return null;
    }

    return {
      cpfCnpj: document,
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
