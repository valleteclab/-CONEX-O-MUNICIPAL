import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateProductClassificationJobDto {
  @ApiPropertyOptional({
    description: 'Se true, só inclui produtos sem NCM (ou NCM inválido).',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  onlyMissingNcm?: boolean;

  @ApiPropertyOptional({
    description: 'Limite de itens nesta execução (server aplica cap via setting).',
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Opcional: restringir a uma lista de produtos.',
    type: [String],
  })
  @IsOptional()
  @IsUUID('4', { each: true })
  productIds?: string[];
}

