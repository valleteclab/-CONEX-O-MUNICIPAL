import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateErpProductDto {
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
  @MaxLength(16)
  ncm?: string;

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
}

export class UpdateErpProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(16)
  ncm?: string | null;

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
  @IsBoolean()
  isActive?: boolean;
}
