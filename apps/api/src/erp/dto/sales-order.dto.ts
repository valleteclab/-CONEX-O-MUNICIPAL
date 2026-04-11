import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

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
}

export class PatchSalesOrderStatusDto {
  @ApiProperty({ enum: ['draft', 'confirmed', 'cancelled'] })
  @IsString()
  @IsIn(['draft', 'confirmed', 'cancelled'])
  status!: 'draft' | 'confirmed' | 'cancelled';
}
