import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';

export const FISCAL_TYPES = ['nfse', 'nfe', 'nfce'] as const;
export type FiscalDocumentType = (typeof FISCAL_TYPES)[number];

export const FISCAL_PAYMENT_METHODS = [
  'cash',
  'credit_card',
  'debit_card',
  'pix',
  'other',
] as const;
export type FiscalPaymentMethod = (typeof FISCAL_PAYMENT_METHODS)[number];

export class EmitFiscalDto {
  @ApiProperty({ description: 'ID do pedido de venda confirmado' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    enum: FISCAL_TYPES,
    description: 'Tipo de documento fiscal a emitir',
  })
  @IsIn(FISCAL_TYPES)
  type!: FiscalDocumentType;

  @ApiPropertyOptional({
    enum: FISCAL_PAYMENT_METHODS,
    description:
      'Forma de pagamento para NFC-e. Ignorado para NF-e e NFS-e.',
  })
  @IsOptional()
  @IsIn(FISCAL_PAYMENT_METHODS)
  paymentMethod?: FiscalPaymentMethod;
}
