import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ErpBusiness } from './erp-business.entity';
import { ErpSalesOrder } from './erp-sales-order.entity';

export type ErpFiscalDocumentType = 'nfse' | 'nfe' | 'nfce';
export type ErpFiscalDocumentPurpose = 'sale' | 'return';
export type ErpFiscalDocumentStatus =
  | 'pending'
  | 'processing'
  | 'authorized'
  | 'rejected'
  | 'cancelled'
  | 'error';

@Entity({ name: 'erp_fiscal_documents' })
export class ErpFiscalDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'business_id', type: 'uuid' })
  businessId: string;

  @ManyToOne(() => ErpBusiness, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'business_id' })
  business: ErpBusiness;

  @Column({ name: 'sales_order_id', type: 'uuid', nullable: true })
  salesOrderId: string | null;

  @ManyToOne(() => ErpSalesOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sales_order_id' })
  salesOrder: ErpSalesOrder | null;

  /** nfse | nfe | nfce */
  @Column({ type: 'varchar', length: 8 })
  type: ErpFiscalDocumentType;

  @Column({ type: 'varchar', length: 16, default: 'sale' })
  purpose: ErpFiscalDocumentPurpose;

  @Column({ name: 'related_document_id', type: 'uuid', nullable: true })
  relatedDocumentId: string | null;

  @ManyToOne(() => ErpFiscalDocument, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'related_document_id' })
  relatedDocument: ErpFiscalDocument | null;

  @Column({ name: 'related_access_key', type: 'varchar', length: 48, nullable: true })
  relatedAccessKey: string | null;

  /** ID interno do PlugNotas (ObjectId MongoDB) */
  @Column({ name: 'plugnotas_id', type: 'varchar', length: 64, nullable: true })
  plugnotasId: string | null;

  /** Nosso ID de referência (orderId ou gerado) */
  @Column({ name: 'id_integracao', type: 'varchar', length: 64, nullable: true })
  idIntegracao: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: ErpFiscalDocumentStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  numero: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  serie: string | null;

  /** Chave de acesso NF-e (44 dígitos) */
  @Column({ type: 'varchar', length: 48, nullable: true })
  chave: string | null;

  @Column({ name: 'xml_url', type: 'text', nullable: true })
  xmlUrl: string | null;

  @Column({ name: 'pdf_url', type: 'text', nullable: true })
  pdfUrl: string | null;

  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: object | null;

  @Column({ name: 'operation_snapshot', type: 'jsonb', nullable: true })
  operationSnapshot: object | null;

  @Column({ name: 'provider_event_payload', type: 'jsonb', nullable: true })
  providerEventPayload: object | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason: string | null;

  @Column({ name: 'cancel_requested_at', type: 'timestamptz', nullable: true })
  cancelRequestedAt: Date | null;

  @Column({ name: 'cancel_authorized_at', type: 'timestamptz', nullable: true })
  cancelAuthorizedAt: Date | null;

  @Column({ name: 'emitted_at', type: 'timestamptz', nullable: true })
  emittedAt: Date | null;

  @Column({ name: 'effect_applied_at', type: 'timestamptz', nullable: true })
  effectAppliedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
