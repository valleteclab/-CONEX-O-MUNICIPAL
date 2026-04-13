import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
import { FISCAL_PAYMENT_METHODS } from './fiscal.dto';

export class SalesOrderLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumberString()
  qty!: string;

  @ApiProperty()
  @IsNumberString()
  unitPrice!: string;
}

export class CreateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional({
    enum: ['erp', 'pdv', 'portal_diretorio', 'portal_cotacoes'],
  })
  @IsOptional()
  @IsIn(['erp', 'pdv', 'portal_diretorio', 'portal_cotacoes'])
  source?: 'erp' | 'pdv' | 'portal_diretorio' | 'portal_cotacoes';

  @ApiProperty({ type: [SalesOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  items!: SalesOrderLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({
    enum: FISCAL_PAYMENT_METHODS,
    description: 'Meio de pagamento principal da venda',
  })
  @IsOptional()
  @IsIn(FISCAL_PAYMENT_METHODS)
  paymentMethod?: 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'other';
}

export class PatchSalesOrderStatusDto {
  @ApiProperty({ enum: ['draft', 'confirmed', 'cancelled'] })
  @IsString()
  @IsIn(['draft', 'confirmed', 'cancelled'])
  status!: 'draft' | 'confirmed' | 'cancelled';

  @ApiPropertyOptional({
    default: false,
    description:
      'Quando cancelar uma venda com documento fiscal autorizado, cancela a nota vinculada antes de reverter a venda.',
  })
  @IsOptional()
  @IsBoolean()
  cancelFiscalDocument?: boolean;
}

export class CancelSalesOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  reason!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  cancelFiscalIfPossible?: boolean;
}
