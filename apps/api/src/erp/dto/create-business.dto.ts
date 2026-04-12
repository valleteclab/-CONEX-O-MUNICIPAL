import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BusinessSegmentPresetKey } from '../types/business-segment-preset.types';

export class CreateErpBusinessDto {
  @ApiProperty({ example: 'Comercio Exemplo Ltda' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  tradeName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({
    description: 'CNPJ/CPF sem mascara; aceita CNPJ alfanumerico',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional({
    description: 'Endereco do estabelecimento (ex.: consulta CNPJ)',
  })
  @IsOptional()
  @IsObject()
  address?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Codigo IBGE do municipio (7 digitos), se ja souber',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  cityIbgeCode?: string;

  @ApiPropertyOptional({
    enum: [
      'mei',
      'simples_nacional',
      'simples_nacional_excesso',
      'lucro_presumido',
      'lucro_real',
    ],
  })
  @IsOptional()
  @IsIn([
    'mei',
    'simples_nacional',
    'simples_nacional_excesso',
    'lucro_presumido',
    'lucro_real',
  ])
  taxRegime?: string;

  @ApiPropertyOptional({
    description: 'Mesclado em fiscal_config (ex.: cnae sugerido pela consulta CNPJ)',
  })
  @IsOptional()
  @IsObject()
  fiscalConfig?: Record<string, unknown>;

  @ApiPropertyOptional({
    enum: [
      'beauty_salon',
      'bakery',
      'mini_market',
      'auto_repair',
      'bike_repair',
      'locksmith',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn([
    'beauty_salon',
    'bakery',
    'mini_market',
    'auto_repair',
    'bike_repair',
    'locksmith',
  ])
  segmentPresetKey?: BusinessSegmentPresetKey;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  onboardingAnswers?: Record<string, string | number | boolean>;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  applyPresetNow?: boolean;
}
