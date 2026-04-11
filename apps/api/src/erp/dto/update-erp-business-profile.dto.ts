import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Campos opcionais para PATCH; preencher dados fiscais do emitente antes de NF-e/NFS-e. */
export class UpdateErpBusinessProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  legalName?: string;

  /** CNPJ/CPF; aceita CNPJ alfanumerico. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  /** Endereco do emitente: logradouro, numero, complemento, bairro, cep, uf. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  address?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Inscricao municipal (NFS-e)' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inscricaoMunicipal?: string;

  @ApiPropertyOptional({
    description: 'Inscricao estadual (NF-e); use ISENTO se aplicavel',
  })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inscricaoEstadual?: string;

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

  /** Codigo IBGE do municipio (7 digitos). */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\d{7}$/, { message: 'cityIbgeCode deve ter 7 digitos (IBGE)' })
  cityIbgeCode?: string;

  /**
   * Mesclado com o JSON existente. Ex.: nfse: { serviceCode, cnae, issAliquota },
   * plugnotasRegistered pode ser false para forcar re-registro apos mudanca de CNPJ.
   */
  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  fiscalConfig?: Record<string, unknown>;
}
