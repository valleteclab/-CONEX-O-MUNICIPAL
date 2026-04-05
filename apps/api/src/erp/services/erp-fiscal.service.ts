import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpFiscalDocument } from '../../entities/erp-fiscal-document.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import { ErpParty } from '../../entities/erp-party.entity';
import { PlugNotasService, PlugNotasDocumentResponse } from './plugnotas.service';
import { EmitFiscalDto } from '../dto/fiscal.dto';

/** Status reportado pelo PlugNotas normalizado para nosso domínio */
function normalizeStatus(raw: string): ErpFiscalDocument['status'] {
  const s = (raw ?? '').toUpperCase();
  if (s === 'CONCLUIDO' || s === 'AUTORIZADO' || s === 'AUTHORIZED') return 'authorized';
  if (s === 'REJEITADO' || s === 'REJECTED') return 'rejected';
  if (s === 'CANCELADO' || s === 'CANCELLED') return 'cancelled';
  if (s === 'PROCESSANDO' || s === 'PROCESSING' || s === 'AGUARDANDO') return 'processing';
  if (s === 'ERRO' || s === 'ERROR') return 'error';
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
    @InjectRepository(ErpProduct)
    private readonly products: Repository<ErpProduct>,
    @InjectRepository(ErpParty)
    private readonly parties: Repository<ErpParty>,
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
    if (!doc) throw new NotFoundException('Documento fiscal não encontrado');
    return doc;
  }

  async emitFromOrder(
    business: ErpBusiness,
    dto: EmitFiscalDto,
  ): Promise<ErpFiscalDocument> {
    const { orderId, type } = dto;

    // Verificar se já existe documento para este pedido + tipo
    const existing = await this.docs.findOne({
      where: {
        salesOrderId: orderId,
        type,
        businessId: business.id,
        tenantId: business.tenantId,
      },
    });
    if (existing && existing.status !== 'error' && existing.status !== 'rejected') {
      throw new BadRequestException(
        `Já existe um documento ${type.toUpperCase()} para este pedido (status: ${existing.status})`,
      );
    }

    // Carregar pedido com items + produto + party
    const order = await this.orders.findOne({
      where: { id: orderId, businessId: business.id, tenantId: business.tenantId },
      relations: ['items', 'items.product', 'party'],
    });
    if (!order) throw new NotFoundException('Pedido de venda não encontrado');
    if (order.status !== 'confirmed') {
      throw new BadRequestException(
        'Somente pedidos confirmados podem gerar nota fiscal',
      );
    }

    // Registrar empresa no PlugNotas (lazy — apenas quando ainda não registrado)
    await this.ensureEmpresaRegistered(business);

    // Construir payload e emitir
    let plugnotasResponse: PlugNotasDocumentResponse;
    try {
      let responses: PlugNotasDocumentResponse[];
      if (type === 'nfse') {
        responses = await this.plugnotas.emitNfse(
          this.buildNfsePayload(business, order),
        );
      } else {
        responses = await this.plugnotas.emitNfe(
          this.buildNfePayload(business, order),
        );
      }
      plugnotasResponse = responses[0];
    } catch (err) {
      // Salvar documento com status error para rastreabilidade
      const errDoc = existing ?? this.docs.create();
      errDoc.tenantId = business.tenantId;
      errDoc.businessId = business.id;
      errDoc.salesOrderId = orderId;
      errDoc.type = type;
      errDoc.idIntegracao = orderId;
      errDoc.status = 'error';
      errDoc.errorMessage = (err as Error).message;
      await this.docs.save(errDoc);
      throw err;
    }

    // Persistir documento com dados do PlugNotas
    const doc = existing ?? this.docs.create();
    doc.tenantId = business.tenantId;
    doc.businessId = business.id;
    doc.salesOrderId = orderId;
    doc.type = type;
    doc.plugnotasId = plugnotasResponse.id ?? null;
    doc.idIntegracao = plugnotasResponse.idIntegracao ?? orderId;
    doc.status = normalizeStatus(plugnotasResponse.status ?? 'processing');
    doc.numero = plugnotasResponse.numero ?? null;
    doc.serie = plugnotasResponse.serie ?? null;
    doc.chave = plugnotasResponse.chave ?? null;
    doc.xmlUrl = plugnotasResponse.xml ?? null;
    doc.pdfUrl = plugnotasResponse.pdf ?? null;
    doc.rawResponse = plugnotasResponse as unknown as object;
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
        'Documento sem ID PlugNotas — não é possível consultar status',
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

  async cancel(business: ErpBusiness, docId: string): Promise<ErpFiscalDocument> {
    const doc = await this.findOne(business, docId);
    if (doc.status !== 'authorized') {
      throw new BadRequestException(
        'Somente documentos autorizados podem ser cancelados',
      );
    }
    if (!doc.plugnotasId) {
      throw new BadRequestException('Documento sem ID PlugNotas');
    }
    await this.plugnotas.cancel(doc.type, doc.plugnotasId);
    doc.status = 'cancelled';
    return this.docs.save(doc);
  }

  /** Receber webhook do PlugNotas e atualizar status do documento */
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    const plugnotasId = payload['id'] as string | undefined;
    if (!plugnotasId) return;
    const doc = await this.docs.findOne({ where: { plugnotasId } });
    if (!doc) return;
    const status = normalizeStatus((payload['status'] as string) ?? '');
    doc.status = status;
    doc.numero = (payload['numero'] as string) ?? doc.numero;
    doc.serie = (payload['serie'] as string) ?? doc.serie;
    doc.chave = (payload['chave'] as string) ?? doc.chave;
    doc.xmlUrl = (payload['xml'] as string) ?? doc.xmlUrl;
    doc.pdfUrl = (payload['pdf'] as string) ?? doc.pdfUrl;
    doc.rawResponse = payload as object;
    await this.docs.save(doc);
    this.logger.log(
      `Webhook PlugNotas: doc ${doc.id} → status ${doc.status}`,
    );
  }

  // ─── Payload builders ───────────────────────────────────────────────

  private buildNfsePayload(
    business: ErpBusiness,
    order: ErpSalesOrder,
  ): object[] {
    const fc = (business.fiscalConfig ?? {}) as Record<string, unknown>;
    const nfseCfg = (fc['nfse'] ?? {}) as Record<string, unknown>;
    const addr = (business.address ?? {}) as Record<string, string>;
    const party = order.party;

    const discriminacao = order.items
      .map((i) => `${i.product?.name ?? i.productId} (${i.qty})`)
      .join('; ');

    return [
      {
        idIntegracao: order.id,
        prestador: {
          cpfCnpj: (business.document ?? '').replace(/\D/g, ''),
          inscricaoMunicipal: business.inscricaoMunicipal ?? '',
          razaoSocial: business.legalName ?? business.tradeName,
          endereco: {
            logradouro: addr['logradouro'] ?? 'Endereço não informado',
            numero: addr['numero'] ?? 'S/N',
            complemento: addr['complemento'] ?? undefined,
            bairro: addr['bairro'] ?? undefined,
            codigoMunicipio: business.cityIbgeCode ?? '2919207',
            cep: (addr['cep'] ?? '').replace(/\D/g, ''),
          },
        },
        tomador: party
          ? {
              cpfCnpj: party.document
                ? party.document.replace(/\D/g, '')
                : undefined,
              razaoSocial: party.legalName ?? party.name,
              email: party.email ?? undefined,
            }
          : { razaoSocial: 'Consumidor Final' },
        servico: {
          codigo: (nfseCfg['serviceCode'] as string) ?? '01.07',
          discriminacao,
          cnae: (nfseCfg['cnae'] as string) ?? '6201500',
          iss: {
            aliquota: Number(nfseCfg['issAliquota'] ?? 2),
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
  ): object[] {
    const addr = (business.address ?? {}) as Record<string, string>;
    const party = order.party;

    const produtos = order.items.map((item, idx) => {
      const p = item.product;
      return {
        codigo: p?.sku ?? String(idx + 1),
        descricao: p?.name ?? 'Produto',
        ncm: p?.ncm ?? '00000000',
        cfop: p?.cfopDefault ?? '5102',
        unidadeComercial: p?.unit ?? 'UN',
        quantidade: Number(item.qty),
        valorUnitario: Number(item.unitPrice),
        valorTotal: Number(item.qty) * Number(item.unitPrice),
        origem: Number(p?.originCode ?? 0),
        tributacao: {
          icms: { situacaoTributaria: '400' },
          pis: { situacaoTributaria: '07' },
          cofins: { situacaoTributaria: '07' },
        },
      };
    });

    return [
      {
        idIntegracao: order.id,
        naturezaOperacao: 'Venda de mercadoria',
        emitente: {
          cpfCnpj: (business.document ?? '').replace(/\D/g, ''),
          razaoSocial: business.legalName ?? business.tradeName,
          inscricaoEstadual: business.inscricaoEstadual ?? '',
          endereco: {
            logradouro: addr['logradouro'] ?? 'Endereço não informado',
            numero: addr['numero'] ?? 'S/N',
            codigoMunicipio: business.cityIbgeCode ?? '2919207',
            cep: (addr['cep'] ?? '').replace(/\D/g, ''),
            uf: addr['uf'] ?? 'BA',
          },
          regimeTributario: this.mapRegime(business.taxRegime),
        },
        destinatario: party
          ? {
              cpfCnpj: party.document
                ? party.document.replace(/\D/g, '')
                : undefined,
              razaoSocial: party.legalName ?? party.name,
              email: party.email ?? undefined,
            }
          : undefined,
        produtos,
        totalNfe: {
          valorProdutos: Number(order.totalAmount),
          valorNfe: Number(order.totalAmount),
        },
        transporte: { modalidadeFrete: 9 },
        informacoesAdicionais: `Pedido ${order.id.slice(0, 8)}`,
      },
    ];
  }

  private mapRegime(regime: string | null): number {
    switch (regime) {
      case 'simples_nacional': return 1;
      case 'simples_nacional_excesso': return 2;
      case 'lucro_presumido': return 3;
      case 'lucro_real': return 3;
      case 'mei': return 1;
      default: return 1;
    }
  }

  /** Registra a empresa no PlugNotas na primeira emissão */
  private async ensureEmpresaRegistered(business: ErpBusiness): Promise<void> {
    const fc = (business.fiscalConfig ?? {}) as Record<string, unknown>;
    if (fc['plugnotasRegistered']) return;
    if (!business.document) return; // sem CNPJ não registra

    const sandbox = this.config.get<boolean>('fiscal.sandbox', true);
    const apiBase = this.config.get<string>('fiscal.plugnotasBaseUrl', '');
    // Monta URL do webhook usando a URL base da API (Railway injeta HOST)
    const apiHost = process.env.API_PUBLIC_URL ?? '';
    const webhookUrl = apiHost
      ? `${apiHost}/api/v1/erp/fiscal/webhook`
      : undefined;

    try {
      await this.plugnotas.registerEmpresa({
        cpfCnpj: business.document.replace(/\D/g, ''),
        razaoSocial: business.legalName ?? business.tradeName,
        nfse: { ativo: true, numero: 1, serie: '1' },
        nfe: { ativo: true, numero: 1, serie: '1' },
        config: {
          producao: !sandbox,
          ...(webhookUrl ? { webhook: webhookUrl } : {}),
        },
      });
    } catch (err) {
      // Falha no registro da empresa não bloqueia a emissão no sandbox
      this.logger.warn(
        `Não foi possível registrar empresa ${business.id} no PlugNotas: ${(err as Error).message}`,
      );
      return;
    }

    // Marcar como registrado para não repetir
    await this.businesses.update(business.id, {
      fiscalConfig: { ...fc, plugnotasRegistered: true },
    });
    business.fiscalConfig = { ...fc, plugnotasRegistered: true };
  }
}
