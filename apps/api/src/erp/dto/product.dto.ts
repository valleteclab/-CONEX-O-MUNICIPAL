import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateErpProductDto {
  @ApiPropertyOptional({ enum: ['product', 'service'], default: 'product' })
  @IsOptional()
  @IsString()
  @IsIn(['product', 'service'])
  kind?: 'product' | 'service';

  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  ncm?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  cest?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  originCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  cfopDefault?: string;

  @ApiPropertyOptional({ default: 'UN' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string;

  @ApiPropertyOptional({ default: '0' })
  @IsOptional()
  @IsNumberString()
  cost?: string;

  @ApiPropertyOptional({ default: '0' })
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional({ default: '0' })
  @IsOptional()
  @IsNumberString()
  minStock?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  launchInitialStock?: boolean;

  @ApiPropertyOptional({ default: '0' })
  @IsOptional()
  @IsNumberString()
  initialStockQuantity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  initialStockLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  taxConfig?: Record<string, unknown>;
}

export class UpdateErpProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  sku?: string;

  @ApiPropertyOptional({ enum: ['product', 'service'] })
  @IsOptional()
  @IsString()
  @IsIn(['product', 'service'])
  kind?: 'product' | 'service';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  barcode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  supplierCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  ncm?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  cest?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  originCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8)
  cfopDefault?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  cost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  price?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  minStock?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  taxConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
