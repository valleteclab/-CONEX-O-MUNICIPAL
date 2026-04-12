import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateQuotationResponseDto {
  @ApiProperty({ example: 'Temos equipe disponível para atender esta demanda ainda esta semana.' })
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  responderBusinessId?: string;
}
