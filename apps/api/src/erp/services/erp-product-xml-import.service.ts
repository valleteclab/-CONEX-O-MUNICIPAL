import { createHash } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { normalizeFiscalDocument } from '../../common/fiscal-document';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpProduct } from '../../entities/erp-product.entity';
import {
  ErpProductXmlImport,
  ErpProductXmlImportStatus,
} from '../../entities/erp-product-xml-import.entity';
import {
  ErpProductXmlImportItem,
  ErpProductXmlImportItemAction,
} from '../../entities/erp-product-xml-import-item.entity';
import { ErpPurchaseOrder } from '../../entities/erp-purchase-order.entity';
import { ErpPurchaseOrderItem } from '../../entities/erp-purchase-order-item.entity';
import {
  ApplyProductXmlImportDto,
  ProductXmlImportDraftProductDto,
} from '../dto/product-xml-import.dto';
import { dec } from '../utils/decimal';
import { ErpPartyService } from './erp-party.service';

type ParsedImportSupplier = {
  name: string;
  legalName: string | null;
  document: string;
  phone: string | null;
  stateRegistration: string | null;
  address: Record<string, unknown>;
};

type ParsedImportItem = {
  lineNumber: number;
  supplierCode: string | null;
  barcode: string | null;
  name: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  originCode: string | null;
  unit: string | null;
  qty: string;
  unitPrice: string;
  totalPrice: string;
  draftProduct: ProductXmlImportDraftProductDto;
  match?: {
    productId: string;
    strategy: string;
    confidence: number;
    reason: string;
  } | null;
};

type ParsedNfeXml = {
  accessKey: string;
  invoiceNumber: string | null;
  invoiceSeries: string | null;
  issuedAt: Date | null;
  supplier: ParsedImportSupplier;
  totalAmount: string;
  items: ParsedImportItem[];
};

function sanitizeXml(xml: string): string {
  return xml
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/\sxmlns(:\w+)?="[^"]*"/g, '')
    .replace(/<(\/*)(\w+):/g, '<$1');
}

function tagValue(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1]?.trim() ?? null;
}

function tagBlock(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1] ?? null;
}

function decimalString(value: string | null | undefined, fallback = '0'): string {
  const normalized = (value ?? '').replace(',', '.').trim();
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return fallback;
  return dec(parsed);
}

function cleanBarcode(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim().toUpperCase();
  if (!raw || raw === 'SEM GTIN') return null;
  const digits = raw.replace(/\D/g, '');
  return digits || raw;
}

function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function buildDraftSku(
  invoiceNumber: string | null,
  lineNumber: number,
  supplierCode: string | null,
): string {
  const base = supplierCode?.trim() || `XML-${invoiceNumber ?? 'NF'}-${lineNumber}`;
  return base.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 80) || `XML-${lineNumber}`;
}

function parseNfeXml(xmlContent: string): ParsedNfeXml {
  const xml = sanitizeXml(xmlContent);
  const infNFeMatch = xml.match(/<infNFe\b[^>]*\bId="NFe([0-9]{44})"/i);
  const accessKey = infNFeMatch?.[1] ?? tagValue(xml, 'chNFe');
  if (!accessKey || accessKey.length !== 44) {
    throw new BadRequestException('Nao foi possivel identificar a chave da NF-e no XML.');
  }

  const cStat = tagValue(xml, 'cStat');
  if (cStat && cStat !== '100') {
    throw new BadRequestException('Apenas NF-e autorizada pode ser importada.');
  }

  const ideBlock = tagBlock(xml, 'ide') ?? '';
  const emitBlock = tagBlock(xml, 'emit') ?? '';
  const emitAddressBlock = tagBlock(emitBlock, 'enderEmit') ?? '';
  const totalBlock = tagBlock(xml, 'ICMSTot') ?? '';
  const detBlocks = Array.from(xml.matchAll(/<det\b([^>]*)>([\s\S]*?)<\/det>/gi));
  if (detBlocks.length === 0) {
    throw new BadRequestException('O XML nao possui itens de produto para importar.');
  }

  const supplierDocument = normalizeFiscalDocument(
    tagValue(emitBlock, 'CNPJ') ?? tagValue(emitBlock, 'CPF'),
  );
  if (!supplierDocument) {
    throw new BadRequestException('Nao foi possivel identificar o documento do fornecedor no XML.');
  }

  const items = detBlocks.map((match, index) => {
    const attrs = match[1] ?? '';
    const block = match[2] ?? '';
    const prodBlock = tagBlock(block, 'prod') ?? '';
    const icmsBlock = tagBlock(block, 'ICMS00') ?? tagBlock(block, 'ICMS') ?? '';
    const lineNumber = Number(attrs.match(/nItem="(\d+)"/i)?.[1] ?? index + 1);
    const supplierCode = tagValue(prodBlock, 'cProd');
    const barcode = cleanBarcode(tagValue(prodBlock, 'cEAN') ?? tagValue(prodBlock, 'cEANTrib'));
    const name = tagValue(prodBlock, 'xProd') ?? `Item ${lineNumber}`;
    const ncm = tagValue(prodBlock, 'NCM');
    const cest = tagValue(prodBlock, 'CEST');
    const cfop = tagValue(prodBlock, 'CFOP');
    const originCode = tagValue(icmsBlock, 'orig');
    const unit = tagValue(prodBlock, 'uCom') ?? tagValue(prodBlock, 'uTrib');
    const qty = decimalString(tagValue(prodBlock, 'qCom') ?? tagValue(prodBlock, 'qTrib'), '0');
    const unitPrice = decimalString(
      tagValue(prodBlock, 'vUnCom') ?? tagValue(prodBlock, 'vUnTrib'),
      '0',
    );
    const totalPrice = decimalString(tagValue(prodBlock, 'vProd'), '0');

    return {
      lineNumber,
      supplierCode: supplierCode?.slice(0, 80) ?? null,
      barcode,
      name,
      ncm,
      cest,
      cfop,
      originCode,
      unit,
      qty,
      unitPrice,
      totalPrice,
      draftProduct: {
        sku: buildDraftSku(tagValue(ideBlock, 'nNF'), lineNumber, supplierCode),
        name,
        unit: unit ?? 'UN',
        barcode,
        supplierCode: supplierCode?.slice(0, 80) ?? null,
        ncm,
        cest,
        cfopDefault: cfop,
        originCode,
        cost: unitPrice,
      },
    };
  });

  return {
    accessKey,
    invoiceNumber: tagValue(ideBlock, 'nNF'),
    invoiceSeries: tagValue(ideBlock, 'serie'),
    issuedAt: tagValue(ideBlock, 'dhEmi') ? new Date(tagValue(ideBlock, 'dhEmi')!) : null,
    supplier: {
      name: tagValue(emitBlock, 'xNome') ?? 'Fornecedor',
      legalName: tagValue(emitBlock, 'xNome'),
      document: supplierDocument,
      phone: tagValue(emitAddressBlock, 'fone'),
      stateRegistration: tagValue(emitBlock, 'IE'),
      address: {
        street: tagValue(emitAddressBlock, 'xLgr'),
        number: tagValue(emitAddressBlock, 'nro'),
        complement: tagValue(emitAddressBlock, 'xCpl'),
        district: tagValue(emitAddressBlock, 'xBairro'),
        cityCode: tagValue(emitAddressBlock, 'cMun'),
        city: tagValue(emitAddressBlock, 'xMun'),
        state: tagValue(emitAddressBlock, 'UF'),
        zipCode: tagValue(emitAddressBlock, 'CEP'),
      },
    },
    totalAmount: decimalString(tagValue(totalBlock, 'vNF') ?? tagValue(totalBlock, 'vProd'), '0'),
    items,
  };
}

@Injectable()
export class ErpProductXmlImportService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly parties: ErpPartyService,
    @InjectRepository(ErpProduct)
    private readonly products: Repository<ErpProduct>,
    @InjectRepository(ErpProductXmlImport)
    private readonly imports: Repository<ErpProductXmlImport>,
    @InjectRepository(ErpProductXmlImportItem)
    private readonly importItems: Repository<ErpProductXmlImportItem>,
    @InjectRepository(ErpPurchaseOrder)
    private readonly purchaseOrders: Repository<ErpPurchaseOrder>,
  ) {}

  async createFromXml(
    business: ErpBusiness,
    xmlContent: string,
  ): Promise<ErpProductXmlImport> {
    const xml = xmlContent.trim();
    if (!xml) {
      throw new BadRequestException('Envie o conteudo do XML para importar.');
    }

    const parsed = parseNfeXml(xml);
    const existing = await this.imports.findOne({
      where: {
        businessId: business.id,
        tenantId: business.tenantId,
        accessKey: parsed.accessKey,
      },
    });
    if (existing) {
      throw new BadRequestException('Esta NF-e ja foi importada para este negocio.');
    }

    const supplier = await this.parties.upsertSupplierFromImport(business, {
      name: parsed.supplier.name,
      legalName: parsed.supplier.legalName,
      document: parsed.supplier.document,
      phone: parsed.supplier.phone,
      stateRegistration: parsed.supplier.stateRegistration,
      address: parsed.supplier.address,
      notes: `Fornecedor conciliado automaticamente a partir da NF-e ${parsed.accessKey}.`,
    });

    const activeProducts = await this.products.find({
      where: {
        businessId: business.id,
        tenantId: business.tenantId,
        isActive: true,
      },
      order: { name: 'ASC' },
    });

    const row = this.imports.create({
      tenantId: business.tenantId,
      businessId: business.id,
      supplierPartyId: supplier.id,
      accessKey: parsed.accessKey,
      invoiceNumber: parsed.invoiceNumber,
      invoiceSeries: parsed.invoiceSeries,
      issuedAt: parsed.issuedAt,
      supplierSnapshot: parsed.supplier,
      summary: {
        totalAmount: parsed.totalAmount,
        totalItems: parsed.items.length,
      },
      status: 'uploaded',
      xmlHash: createHash('sha256').update(xml).digest('hex'),
      sourceXml: xml,
      items: parsed.items.map((item) => {
        const match = this.suggestMatch(item, activeProducts);
        return this.importItems.create({
          lineNumber: item.lineNumber,
          supplierCode: item.supplierCode,
          barcode: item.barcode,
          name: item.name,
          ncm: item.ncm,
          cest: item.cest,
          cfop: item.cfop,
          originCode: item.originCode,
          unit: item.unit,
          qty: item.qty,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          suggestedProductId: match?.productId ?? null,
          matchMeta: match
            ? {
                strategy: match.strategy,
                confidence: match.confidence,
                reason: match.reason,
              }
            : {},
          draftProduct: item.draftProduct as unknown as Record<string, unknown>,
        });
      }),
    });

    const saved = await this.imports.save(row);
    return this.findOne(business, saved.id);
  }

  async findOne(business: ErpBusiness, id: string): Promise<ErpProductXmlImport> {
    const row = await this.imports.findOne({
      where: { id, businessId: business.id, tenantId: business.tenantId },
      relations: [
        'supplierParty',
        'items',
        'items.suggestedProduct',
        'items.selectedProduct',
      ],
      order: { items: { lineNumber: 'ASC' } },
    });
    if (!row) {
      throw new NotFoundException('Importacao XML nao encontrada');
    }
    return row;
  }

  async apply(
    business: ErpBusiness,
    id: string,
    dto: ApplyProductXmlImportDto,
  ): Promise<ErpProductXmlImport> {
    const importRow = await this.findOne(business, id);
    if (importRow.status === 'applied') {
      throw new BadRequestException('Esta importacao ja foi aplicada ao catalogo.');
    }

    const decisions = new Map(dto.items.map((item) => [item.itemId, item]));
    if (decisions.size !== importRow.items.length) {
      throw new BadRequestException('Revise todos os itens da importacao antes de aplicar.');
    }

    await this.dataSource.transaction(async (em) => {
      for (const item of importRow.items) {
        const decision = decisions.get(item.id);
        if (!decision) {
          throw new BadRequestException(`Item ${item.id} sem decisao informada.`);
        }

        item.action = decision.action as ErpProductXmlImportItemAction;

        if (decision.action === 'ignore') {
          item.selectedProductId = null;
          item.draftProduct = {};
          await em.save(item);
          continue;
        }

        if (decision.action === 'link') {
          if (!decision.selectedProductId) {
            throw new BadRequestException(`Selecione um produto para o item ${item.lineNumber}.`);
          }
          const product = await em.findOne(ErpProduct, {
            where: {
              id: decision.selectedProductId,
              businessId: business.id,
              tenantId: business.tenantId,
            },
          });
          if (!product) {
            throw new BadRequestException(`Produto invalido no item ${item.lineNumber}.`);
          }

          product.cost = dec(item.unitPrice);
          if (!product.barcode && item.barcode) product.barcode = item.barcode;
          if (!product.supplierCode && item.supplierCode) product.supplierCode = item.supplierCode;
          if (!product.ncm && item.ncm) product.ncm = item.ncm;
          if (!product.cest && item.cest) product.cest = item.cest;
          if (!product.cfopDefault && item.cfop) product.cfopDefault = item.cfop;
          if (!product.originCode && item.originCode) product.originCode = item.originCode;
          await em.save(product);

          item.selectedProductId = product.id;
          item.draftProduct = {};
          await em.save(item);
          continue;
        }

        const draft = {
          ...(item.draftProduct ?? {}),
          ...(decision.createProduct ?? {}),
        } as Record<string, unknown>;
        const sku = String(draft.sku ?? '').trim();
        const name = String(draft.name ?? '').trim();
        if (!sku || !name) {
          throw new BadRequestException(`Informe SKU e nome para criar o item ${item.lineNumber}.`);
        }

        const existingSku = await em.findOne(ErpProduct, {
          where: {
            businessId: business.id,
            tenantId: business.tenantId,
            sku,
          },
        });
        if (existingSku) {
          throw new BadRequestException(`SKU ${sku} ja existe no catalogo.`);
        }

        const created = em.create(ErpProduct, {
          tenantId: business.tenantId,
          businessId: business.id,
          kind: 'product',
          sku,
          name,
          barcode: this.stringOrNull(draft.barcode) ?? item.barcode,
          supplierCode: this.stringOrNull(draft.supplierCode) ?? item.supplierCode,
          ncm: this.stringOrNull(draft.ncm) ?? item.ncm,
          cest: this.stringOrNull(draft.cest) ?? item.cest,
          cfopDefault: this.stringOrNull(draft.cfopDefault) ?? item.cfop,
          originCode: this.stringOrNull(draft.originCode) ?? item.originCode,
          unit: this.stringOrNull(draft.unit) ?? item.unit ?? 'UN',
          cost: dec(this.stringOrNull(draft.cost) ?? item.unitPrice),
          price: dec(0),
          minStock: dec(0),
          taxConfig: {
            importedFromXml: {
              importId: importRow.id,
              accessKey: importRow.accessKey,
              lineNumber: item.lineNumber,
            },
          },
          isActive: true,
        });
        await em.save(created);

        item.selectedProductId = created.id;
        item.draftProduct = draft;
        await em.save(item);
      }

      importRow.status = 'applied' as ErpProductXmlImportStatus;
      await em.save(importRow);
    });

    return this.findOne(business, id);
  }

  async createPurchaseOrder(
    business: ErpBusiness,
    id: string,
  ): Promise<ErpPurchaseOrder> {
    const importRow = await this.findOne(business, id);
    if (!importRow.supplierPartyId) {
      throw new BadRequestException('Importacao sem fornecedor conciliado.');
    }
    if (importRow.purchaseOrderId) {
      const existing = await this.purchaseOrders.findOne({
        where: {
          id: importRow.purchaseOrderId,
          businessId: business.id,
          tenantId: business.tenantId,
        },
        relations: ['items', 'items.product', 'supplierParty'],
      });
      if (existing) return existing;
    }

    if (importRow.status !== 'applied') {
      throw new BadRequestException('Aplique a importacao ao catalogo antes de gerar o pedido.');
    }

    const selectedItems = importRow.items.filter(
      (item) =>
        item.action !== 'ignore' &&
        item.selectedProductId &&
        Number(item.qty) > 0,
    );
    if (selectedItems.length === 0) {
      throw new BadRequestException('Nenhum item conciliado para gerar pedido de compra.');
    }

    const createdId = await this.dataSource.transaction(async (em) => {
      let total = 0;
      for (const item of selectedItems) {
        total += Number(item.totalPrice);
      }

      const order = em.create(ErpPurchaseOrder, {
        tenantId: business.tenantId,
        businessId: business.id,
        supplierPartyId: importRow.supplierPartyId!,
        status: 'draft',
        totalAmount: dec(total),
        note: `Gerado da importacao XML ${importRow.accessKey}.`,
      });
      await em.save(order);

      for (const item of selectedItems) {
        await em.save(
          em.create(ErpPurchaseOrderItem, {
            orderId: order.id,
            productId: item.selectedProductId!,
            qty: dec(item.qty),
            unitPrice: dec(item.unitPrice),
          }),
        );
      }

      importRow.purchaseOrderId = order.id;
      await em.save(importRow);
      return order.id;
    });

    const order = await this.purchaseOrders.findOne({
      where: { id: createdId, businessId: business.id, tenantId: business.tenantId },
      relations: ['items', 'items.product', 'supplierParty'],
    });
    if (!order) {
      throw new NotFoundException('Pedido de compra gerado nao encontrado.');
    }
    return order;
  }

  private stringOrNull(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  private suggestMatch(
    item: ParsedImportItem,
    products: ErpProduct[],
  ): ParsedImportItem['match'] {
    if (item.barcode) {
      const byBarcode = products.find((product) => product.barcode === item.barcode);
      if (byBarcode) {
        return {
          productId: byBarcode.id,
          strategy: 'barcode',
          confidence: 0.99,
          reason: 'EAN/codigo de barras igual no catalogo.',
        };
      }
    }

    if (item.supplierCode) {
      const bySupplierCode = products.find(
        (product) =>
          product.supplierCode &&
          product.supplierCode.trim().toUpperCase() === item.supplierCode!.trim().toUpperCase(),
      );
      if (bySupplierCode) {
        return {
          productId: bySupplierCode.id,
          strategy: 'supplier_code',
          confidence: 0.95,
          reason: 'Codigo do fornecedor igual ao item do XML.',
        };
      }
    }

    const itemName = normalizeName(item.name);
    let best: { product: ErpProduct; score: number } | null = null;
    for (const product of products) {
      const productName = normalizeName(product.name);
      if (!itemName || !productName) continue;
      let score = this.tokenScore(itemName, productName);
      if (
        item.unit &&
        product.unit &&
        item.unit.trim().toUpperCase() === product.unit.trim().toUpperCase()
      ) {
        score += 0.1;
      }
      const productCost = Number(product.cost);
      const itemCost = Number(item.unitPrice);
      if (productCost > 0 && itemCost > 0) {
        const diff = Math.abs(productCost - itemCost) / Math.max(productCost, itemCost);
        if (diff <= 0.1) score += 0.1;
        else if (diff <= 0.25) score += 0.05;
      }
      if (!best || score > best.score) {
        best = { product, score };
      }
    }

    if (best && best.score >= 0.55) {
      return {
        productId: best.product.id,
        strategy: 'name_similarity',
        confidence: Number(Math.min(best.score, 0.89).toFixed(2)),
        reason: 'Nome, unidade e custo sugerem correspondencia com item ja cadastrado.',
      };
    }

    return null;
  }

  private tokenScore(left: string, right: string): number {
    const leftTokens = new Set(left.split(' ').filter(Boolean));
    const rightTokens = new Set(right.split(' ').filter(Boolean));
    if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
    let shared = 0;
    for (const token of leftTokens) {
      if (rightTokens.has(token)) shared++;
    }
    return shared / Math.max(leftTokens.size, rightTokens.size);
  }
}
