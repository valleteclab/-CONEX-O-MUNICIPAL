import { ErpBusiness } from '../../entities/erp-business.entity';
import { ErpSalesOrder } from '../../entities/erp-sales-order.entity';
import { ErpFiscalDocument } from '../../entities/erp-fiscal-document.entity';

export type FiscalProviderName = 'plugnotas' | 'spedy';

export type FiscalProviderDocumentResponse = {
  /** ID do documento no provedor externo */
  providerId: string;
  /** Status normalizado para o domínio interno */
  status: 'pending' | 'processing' | 'authorized' | 'rejected' | 'cancelled' | 'error';
  numero?: string;
  serie?: string;
  /** Chave de acesso (accessKey) — 44 dígitos para NF-e */
  chave?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  message?: string;
  issuedAt?: string;
  authorizedAt?: string;
  /** Resposta bruta do provedor para debug */
  raw: unknown;
};

export interface IFiscalProvider {
  readonly name: FiscalProviderName;

  /** Indica se este provedor suporta o tipo de documento informado */
  supportsType(type: 'nfse' | 'nfe' | 'nfce'): boolean;

  /** Emitir NFS-e a partir de um pedido de venda */
  emitNfse(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): Promise<FiscalProviderDocumentResponse>;

  /** Emitir NF-e a partir de um pedido de venda */
  emitNfe(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
  ): Promise<FiscalProviderDocumentResponse>;

  /** Emitir NFC-e (opcional — apenas provedores que suportam) */
  emitNfce?(
    business: ErpBusiness,
    order: ErpSalesOrder,
    integrationId: string,
    paymentMethod: string,
  ): Promise<FiscalProviderDocumentResponse>;

  /** Consultar status de um documento já emitido */
  getStatus(doc: {
    type: 'nfse' | 'nfe' | 'nfce';
    providerId: string;
    business: ErpBusiness;
  }): Promise<FiscalProviderDocumentResponse>;

  /** Cancelar documento autorizado */
  cancel(
    doc: { type: 'nfse' | 'nfe' | 'nfce'; providerId: string; business: ErpBusiness },
    justification: string,
  ): Promise<unknown>;

  /** Enviar Carta de Correção Eletrônica (CC-e) — exclusivo NF-e */
  sendCce(
    doc: { providerId: string; business: ErpBusiness },
    correction: string,
  ): Promise<unknown>;

  /** Registrar ou atualizar o emitente no provedor */
  registerEmpresa(business: ErpBusiness): Promise<void>;

  /** Enviar certificado A1 (.pfx/.p12) ao provedor */
  uploadCertificate(
    business: ErpBusiness,
    params: {
      password: string;
      filename: string;
      contentType?: string;
      buffer: Buffer;
      email?: string;
    },
  ): Promise<{ certificateId?: string; message?: string }>;

  /** Emitir NF-e de devolução/retorno */
  emitNfeReturn?(
    business: ErpBusiness,
    order: ErpSalesOrder,
    originalDoc: ErpFiscalDocument,
    items: { productId: string; qty: string; unitPrice: string; totalAmount: string }[],
    integrationId: string,
  ): Promise<FiscalProviderDocumentResponse>;
}
