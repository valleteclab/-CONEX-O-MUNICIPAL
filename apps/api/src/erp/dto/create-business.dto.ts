import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateErpBusinessDto {
  @ApiProperty({ example: 'Padaria Central' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  tradeName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalName?: string;

  @ApiPropertyOptional({ description: 'CNPJ/CPF sem máscara' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;
}
