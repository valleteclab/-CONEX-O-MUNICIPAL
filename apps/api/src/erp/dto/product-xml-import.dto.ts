import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateProductXmlImportDto {
  @ApiProperty({ description: 'Conteudo bruto do XML da NF-e de entrada' })
  @IsString()
  xmlContent!: string;
}

export class ProductXmlImportDraftProductDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  sku!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  unit?: string;

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
  @MaxLength(8)
  cfopDefault?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4)
  originCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  cost?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  price?: string;
}

export class ProductXmlImportDecisionDto {
  @ApiProperty()
  @IsUUID()
  itemId!: string;

  @ApiProperty({ enum: ['link', 'create', 'ignore'] })
  @IsString()
  @IsIn(['link', 'create', 'ignore'])
  action!: 'link' | 'create' | 'ignore';

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  selectedProductId?: string;

  @ApiPropertyOptional({ type: ProductXmlImportDraftProductDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProductXmlImportDraftProductDto)
  createProduct?: ProductXmlImportDraftProductDto;
}

export class ApplyProductXmlImportDto {
  @ApiProperty({ type: [ProductXmlImportDecisionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductXmlImportDecisionDto)
  items!: ProductXmlImportDecisionDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  launchStockNow?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  stockLocationId?: string;
}
