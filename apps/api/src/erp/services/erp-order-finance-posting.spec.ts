import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErpAccountPayable } from '../../entities/erp-account-payable.entity';
import { ErpAccountReceivable } from '../../entities/erp-account-receivable.entity';
import { ErpPurchaseOrder } from '../../entities/erp-purchase-order.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpPurchaseOrderService } from './erp-purchase-order.service';
import { ErpSalesOrderService } from './erp-sales-order.service';

type MockEntityManager = {
  findOne: jest.Mock<Promise<any>, [unknown, unknown?]>;
  create: jest.Mock<any, [unknown, unknown?]>;
  save: jest.Mock<Promise<any>, [unknown, unknown?]>;
};

describe('ERP order finance posting', () => {
  const business = {
    id: 'business-1',
    tenantId: 'tenant-1',
  } as any;

  function createDataSource(em: MockEntityManager): DataSource {
    return {
      transaction: jest.fn(async (cb: (manager: EntityManager) => unknown) =>
        cb(em as unknown as EntityManager),
      ),
    } as unknown as DataSource;
  }

  it('creates receivable automatically when confirming a sales order', async () => {
    const order = {
      id: 'sales-order-1',
      tenantId: business.tenantId,
      businessId: business.id,
      partyId: 'party-1',
      status: 'draft',
      totalAmount: '125.5000',
      createdAt: new Date('2026-04-11T10:00:00.000Z'),
      items: [
        {
          productId: 'product-service',
          qty: '1.0000',
          unitPrice: '125.5000',
          product: { id: 'product-service', name: 'Consultoria', kind: 'service' },
        },
      ],
      party: { id: 'party-1', name: 'Cliente XPTO' },
    } as any;

    const em: MockEntityManager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === ErpSalesOrder) return order;
        if (entity === ErpStockLocation)
          return { id: 'loc-1', businessId: business.id, tenantId: business.tenantId, isDefault: true };
        if (entity === ErpAccountReceivable) return null;
        return null;
      }),
      create: jest.fn((_: unknown, payload?: unknown) => payload as any),
      save: jest.fn(async (payload: unknown) => payload as any),
    };

    const ordersRepo = {
      findOne: jest.fn(async () => ({ ...order, status: 'confirmed' })),
    } as unknown as Repository<ErpSalesOrder>;

    const service = new ErpSalesOrderService(createDataSource(em), ordersRepo);

    await service.patchStatus(business, order.id, { status: 'confirmed' });

    expect(em.save).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
        tenantId: business.tenantId,
        partyId: order.partyId,
        amount: '125.5000',
        linkRef: 'sales_order',
        linkId: order.id,
      }),
    );
  });

  it('does not create duplicate receivable for sales order already linked', async () => {
    const order = {
      id: 'sales-order-2',
      tenantId: business.tenantId,
      businessId: business.id,
      partyId: 'party-2',
      status: 'draft',
      totalAmount: '80.0000',
      createdAt: new Date('2026-04-11T10:00:00.000Z'),
      items: [
        {
          productId: 'product-service',
          qty: '1.0000',
          unitPrice: '80.0000',
          product: { id: 'product-service', name: 'Serviço', kind: 'service' },
        },
      ],
    } as any;

    const em: MockEntityManager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === ErpSalesOrder) return order;
        if (entity === ErpStockLocation)
          return { id: 'loc-1', businessId: business.id, tenantId: business.tenantId, isDefault: true };
        if (entity === ErpAccountReceivable)
          return { id: 'ar-1', linkRef: 'sales_order', linkId: order.id };
        return null;
      }),
      create: jest.fn((_: unknown, payload?: unknown) => payload as any),
      save: jest.fn(async (payload: unknown) => payload as any),
    };

    const ordersRepo = {
      findOne: jest.fn(async () => ({ ...order, status: 'confirmed' })),
    } as unknown as Repository<ErpSalesOrder>;

    const service = new ErpSalesOrderService(createDataSource(em), ordersRepo);

    await service.patchStatus(business, order.id, { status: 'confirmed' });

    expect(em.save).not.toHaveBeenCalledWith(
      expect.objectContaining({
        linkRef: 'sales_order',
        linkId: order.id,
      }),
    );
  });

  it('creates payable automatically when receiving a purchase order', async () => {
    const order = {
      id: 'purchase-order-1',
      tenantId: business.tenantId,
      businessId: business.id,
      supplierPartyId: 'supplier-1',
      status: 'confirmed',
      totalAmount: '210.0000',
      createdAt: new Date('2026-04-11T10:00:00.000Z'),
      items: [
        {
          productId: 'product-1',
          qty: '2.0000',
          unitPrice: '105.0000',
          product: { id: 'product-1', name: 'Produto A', kind: 'product' },
        },
      ],
      supplierParty: { id: 'supplier-1', name: 'Fornecedor XPTO' },
    } as any;

    const em: MockEntityManager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === ErpPurchaseOrder) return order;
        if (entity === ErpStockLocation)
          return { id: 'loc-1', businessId: business.id, tenantId: business.tenantId, isDefault: true };
        if (entity === ErpStockBalance) return null;
        if (entity === ErpAccountPayable) return null;
        return null;
      }),
      create: jest.fn((_: unknown, payload?: unknown) => payload as any),
      save: jest.fn(async (payload: unknown) => payload as any),
    };

    const ordersRepo = {
      findOne: jest.fn(async () => ({ ...order, status: 'received' })),
    } as unknown as Repository<ErpPurchaseOrder>;

    const service = new ErpPurchaseOrderService(createDataSource(em), ordersRepo);

    await service.patchStatus(business, order.id, { status: 'received' });

    expect(em.save).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: business.id,
        tenantId: business.tenantId,
        partyId: order.supplierPartyId,
        amount: '210.0000',
        linkRef: 'purchase_order',
        linkId: order.id,
      }),
    );
  });

  it('does not create duplicate payable for purchase order already linked', async () => {
    const order = {
      id: 'purchase-order-2',
      tenantId: business.tenantId,
      businessId: business.id,
      supplierPartyId: 'supplier-2',
      status: 'confirmed',
      totalAmount: '90.0000',
      createdAt: new Date('2026-04-11T10:00:00.000Z'),
      items: [
        {
          productId: 'product-2',
          qty: '1.0000',
          unitPrice: '90.0000',
          product: { id: 'product-2', name: 'Produto B', kind: 'product' },
        },
      ],
    } as any;

    const em: MockEntityManager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === ErpPurchaseOrder) return order;
        if (entity === ErpStockLocation)
          return { id: 'loc-1', businessId: business.id, tenantId: business.tenantId, isDefault: true };
        if (entity === ErpStockBalance) return null;
        if (entity === ErpAccountPayable)
          return { id: 'ap-1', linkRef: 'purchase_order', linkId: order.id };
        return null;
      }),
      create: jest.fn((_: unknown, payload?: unknown) => payload as any),
      save: jest.fn(async (payload: unknown) => payload as any),
    };

    const ordersRepo = {
      findOne: jest.fn(async () => ({ ...order, status: 'received' })),
    } as unknown as Repository<ErpPurchaseOrder>;

    const service = new ErpPurchaseOrderService(createDataSource(em), ordersRepo);

    await service.patchStatus(business, order.id, { status: 'received' });

    expect(em.save).not.toHaveBeenCalledWith(
      expect.objectContaining({
        linkRef: 'purchase_order',
        linkId: order.id,
      }),
    );
  });
});
