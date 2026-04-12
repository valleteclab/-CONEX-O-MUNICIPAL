import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PublicBusinessSignupDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  responsibleName!: string;

  @ApiProperty({ example: 'financeiro@empresa.com.br' })
  @IsEmail()
  @MaxLength(255)
  responsibleEmail!: string;

  @ApiPropertyOptional({ example: '(77) 98888-7777' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  responsiblePhone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, {
    message: 'Senha deve conter ao menos uma letra maiuscula',
  })
  @Matches(/[0-9]/, {
    message: 'Senha deve conter ao menos um numero',
  })
  password!: string;

  @ApiProperty({ example: 'Comercio Exemplo Ltda' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  tradeName!: string;

  @ApiProperty({ example: 'Comercio Exemplo Ltda' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  legalName!: string;

  @ApiProperty({
    example: '12345678000199',
    description: 'CNPJ sem mascara; aceita CNPJ alfanumerico',
  })
  @IsString()
  @MinLength(14)
  @MaxLength(20)
  document!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inscricaoMunicipal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inscricaoEstadual?: string;

  @ApiProperty({ example: '2919553' })
  @IsString()
  @MaxLength(10)
  cityIbgeCode!: string;

  @ApiProperty({
    enum: [
      'mei',
      'simples_nacional',
      'simples_nacional_excesso',
      'lucro_presumido',
      'lucro_real',
    ],
  })
  @IsString()
  @IsIn([
    'mei',
    'simples_nacional',
    'simples_nacional_excesso',
    'lucro_presumido',
    'lucro_real',
  ])
  taxRegime!: string;

  @ApiProperty()
  @IsObject()
  address!: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  fiscalConfig?: Record<string, unknown>;
}
