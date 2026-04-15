import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { ErpAccountReceivable } from '../../entities/erp-account-receivable.entity';
import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpFiscalDocument } from '../../entities/erp-fiscal-document.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpStockBalance } from '../../entities/erp-stock-balance.entity';
import { ErpStockLocation } from '../../entities/erp-stock-location.entity';
import { ErpStockMovement } from '../../entities/erp-stock-movement.entity';
import { ErpFiscalService } from './erp-fiscal.service';
import { PlugNotasService } from './plugnotas.service';

describe('ErpFiscalService', () => {
  let dataSource: Record<string, never>;
  let docs: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let orders: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let businesses: {
    update: jest.Mock;
  };
  let locations: Record<string, never>;
  let balances: Record<string, never>;
  let movements: Record<string, never>;
  let receivables: Record<string, never>;
  let plugnotas: {
    registerEmpresa: jest.Mock;
    uploadCertificate: jest.Mock;
    emitNfse: jest.Mock;
    emitNfe: jest.Mock;
    emitNfce: jest.Mock;
    getStatus: jest.Mock;
    cancel: jest.Mock;
  };
  let config: {
    get: jest.Mock;
  };
  let service: ErpFiscalService;

  beforeEach(() => {
    dataSource = {};
    docs = {
      findOne: jest.fn(),
      create: jest.fn(() => ({})),
      save: jest.fn(async (doc) => doc),
    };
    orders = {
      findOne: jest.fn(),
      save: jest.fn(async (order) => order),
    };
    businesses = {
      update: jest.fn(async () => undefined),
    };
    locations = {};
    balances = {};
    movements = {};
    receivables = {};
    plugnotas = {
      registerEmpresa: jest.fn(async () => undefined),
      uploadCertificate: jest.fn(),
      emitNfse: jest.fn(),
      emitNfe: jest.fn(),
      emitNfce: jest.fn(),
      getStatus: jest.fn(),
      cancel: jest.fn(),
    };
    config = {
      get: jest.fn((key: string, fallback?: unknown) => {
        if (key === 'fiscal.sandbox') return true;
        return fallback;
      }),
    };

    service = new ErpFiscalService(
      dataSource as unknown as DataSource,
      docs as unknown as Repository<ErpFiscalDocument>,
      orders as unknown as Repository<ErpSalesOrder>,
      businesses as unknown as Repository<ErpBusiness>,
      locations as unknown as Repository<ErpStockLocation>,
      balances as unknown as Repository<ErpStockBalance>,
      movements as unknown as Repository<ErpStockMovement>,
      receivables as unknown as Repository<ErpAccountReceivable>,
      plugnotas as unknown as PlugNotasService,
      config as unknown as ConfigService,
    );
  });

  it('marks NFC-e readiness as pending when CSC is missing', () => {
    const business = {
      id: 'business-1',
      tenantId: 'tenant-1',
      document: '29062609000177',
      legalName: 'Loja Exemplo Ltda',
      tradeName: 'Loja Exemplo',
      address: {
        logradouro: 'Rua Principal',
        numero: '10',
        cep: '12345678',
        uf: 'BA',
      },
      cityIbgeCode: '2919207',
      inscricaoEstadual: '123456789',
      taxRegime: 'simples_nacional',
      fiscalConfig: {},
    } as unknown as ErpBusiness;

    const readiness = service.getEmitReadiness(business, 'nfce');

    expect(readiness.ready).toBe(false);
    expect(readiness.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'plugnotas_certificado', ok: false }),
        expect.objectContaining({ id: 'nfce_csc_id', ok: false }),
        expect.objectContaining({ id: 'nfce_csc_code', ok: false }),
      ]),
    );
  });

  it('uploads A1 certificate and syncs emitente data', async () => {
    const business = {
      id: 'business-1',
      tenantId: 'tenant-1',
      document: '29062609000177',
      legalName: 'Loja Exemplo Ltda',
      tradeName: 'Loja Exemplo',
      responsibleEmail: 'fiscal@loja.com',
      address: {
        logradouro: 'Rua Principal',
        numero: '10',
        cep: '12345678',
        uf: 'BA',
      },
      cityIbgeCode: '2919207',
      inscricaoMunicipal: '1234',
      inscricaoEstadual: '123456789',
      taxRegime: 'simples_nacional',
      fiscalConfig: {},
    } as unknown as ErpBusiness;

    plugnotas.uploadCertificate.mockResolvedValue({
      message: 'Cadastro efetuado com sucesso',
      data: { id: 'cert-123' },
    });

    const result = await service.uploadCertificate(business, {
      filename: 'empresa.pfx',
      password: 'segredo',
      buffer: Buffer.from('cert'),
      contentType: 'application/x-pkcs12',
    });

    expect(plugnotas.uploadCertificate).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'empresa.pfx',
        password: 'segredo',
      }),
    );
    expect(businesses.update).toHaveBeenCalledWith(
      'business-1',
      expect.objectContaining({
        fiscalConfig: expect.objectContaining({
          plugnotasCertificateId: 'cert-123',
          plugnotasRegistered: true,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        certificateId: 'cert-123',
        emitenteSynced: true,
      }),
    );
  });

  it('registers emitente for NF-e without forcing NFSe or NFCe configs', async () => {
    const business = {
      id: 'business-1',
      tenantId: 'tenant-1',
      document: '29062609000177',
      legalName: 'Loja Exemplo Ltda',
      tradeName: 'Loja Exemplo',
      responsibleEmail: 'fiscal@loja.com',
      address: {
        logradouro: 'Rua Principal',
        numero: '10',
        cep: '12345678',
        uf: 'BA',
      },
      cityIbgeCode: '2919207',
      inscricaoEstadual: '123456789',
      taxRegime: 'simples_nacional',
      fiscalConfig: {
        plugnotasCertificateId: 'cert-123',
      },
    } as unknown as ErpBusiness;

    const result = await service.registerEmitentePlugnotas(business);

    expect(plugnotas.registerEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        inscricaoEstadual: '123456789',
        nfse: expect.objectContaining({
          ativo: false,
        }),
        nfce: expect.objectContaining({
          ativo: false,
        }),
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        alreadyRegistered: false,
      }),
    );
  });

  it('registers emitente with NFC-e sefaz config only when CSC is complete', async () => {
    const business = {
      id: 'business-1',
      tenantId: 'tenant-1',
      document: '29062609000177',
      legalName: 'Loja Exemplo Ltda',
      tradeName: 'Loja Exemplo',
      responsibleEmail: 'fiscal@loja.com',
      address: {
        logradouro: 'Rua Principal',
        numero: '10',
        cep: '12345678',
        uf: 'BA',
      },
      cityIbgeCode: '2919207',
      inscricaoEstadual: '123456789',
      taxRegime: 'simples_nacional',
      fiscalConfig: {
        plugnotasCertificateId: 'cert-123',
        nfce: {
          cscId: '1',
          cscCode: 'ABC123456',
        },
      },
    } as unknown as ErpBusiness;

    await service.registerEmitentePlugnotas(business);

    expect(plugnotas.registerEmpresa).toHaveBeenCalledWith(
      expect.objectContaining({
        nfce: expect.objectContaining({
          ativo: true,
          config: expect.objectContaining({
            versaoQrCode: 2,
            sefaz: {
              idCodigoSegurancaContribuinte: '1',
              codigoSegurancaContribuinte: 'ABC123456',
            },
          }),
        }),
      }),
    );
  });

  it('emits NFC-e through PlugNotas with the selected payment method', async () => {
    const business = {
      id: 'business-1',
      tenantId: 'tenant-1',
      document: '29062609000177',
      legalName: 'Loja Exemplo Ltda',
      tradeName: 'Loja Exemplo',
      responsibleName: 'Equipe Fiscal',
      responsibleEmail: 'fiscal@loja.com',
      responsiblePhone: '77999990000',
      address: {
        logradouro: 'Rua Principal',
        numero: '10',
        cep: '12345678',
        uf: 'BA',
      },
      cityIbgeCode: '2919207',
      inscricaoEstadual: '123456789',
      taxRegime: 'simples_nacional',
      fiscalConfig: {
        plugnotasCertificateId: 'cert-123',
        plugnotasRegistered: true,
        nfce: {
          cscId: '1',
          cscCode: 'ABC123456',
        },
      },
    } as unknown as ErpBusiness;

    const order = {
      id: 'order-1',
      status: 'confirmed',
      totalAmount: '20.0000',
      items: [
        {
          productId: 'product-1',
          qty: '2.0000',
          unitPrice: '10.0000',
          product: {
            sku: 'SKU-1',
            name: 'Produto A',
            ncm: '12345678',
            cfopDefault: '5102',
            originCode: '0',
            unit: 'UN',
          },
        },
      ],
      party: null,
    } as unknown as ErpSalesOrder;

    docs.findOne.mockResolvedValueOnce(null);
    orders.findOne.mockResolvedValue(order);
    plugnotas.emitNfce.mockResolvedValue([
      {
        id: 'plugnotas-1',
        idIntegracao: 'order-1-nfce',
        status: 'PROCESSANDO',
      },
    ]);

    const result = await service.emitFromOrder(business, {
      orderId: 'order-1',
      type: 'nfce',
      paymentMethod: 'pix',
    });

    expect(plugnotas.emitNfce).toHaveBeenCalledTimes(1);
    const payload = plugnotas.emitNfce.mock.calls[0][0] as Array<{
      idIntegracao: string;
      pagamentos: Array<{ meio: string; valor: number }>;
    }>;
    expect(payload[0].idIntegracao).toBe('order-1-nfce');
    expect(payload[0].pagamentos[0]).toEqual(
      expect.objectContaining({
        meio: '17',
        valor: 20,
      }),
    );

    expect(docs.save).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'business-1',
        tenantId: 'tenant-1',
        salesOrderId: 'order-1',
        type: 'nfce',
        plugnotasId: 'plugnotas-1',
      }),
    );
    expect(result.status).toBe('processing');
  });
});
