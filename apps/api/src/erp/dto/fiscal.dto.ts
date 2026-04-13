import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

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

export class CancelFiscalDocumentDto {
  @ApiProperty({ description: 'Motivo do cancelamento fiscal' })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class CancelSalesOrderDto {
  @ApiProperty({ description: 'Motivo do cancelamento da venda' })
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Tenta cancelar o documento fiscal autorizado antes de cancelar a venda',
  })
  @IsOptional()
  @IsBoolean()
  cancelFiscalIfPossible?: boolean;
}

export class FiscalReturnLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumberString()
  qty!: string;
}

export class CreateFiscalReturnDto {
  @ApiProperty()
  @IsUUID()
  salesOrderId!: string;

  @ApiProperty()
  @IsUUID()
  originalFiscalDocumentId!: string;

  @ApiProperty({ type: [FiscalReturnLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FiscalReturnLineDto)
  items!: FiscalReturnLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
