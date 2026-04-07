import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateErpProductClassifierSettingDto {
  @ApiPropertyOptional({
    description: 'Modelo OpenRouter (ex.: anthropic/claude-3.5-sonnet)',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Temperatura do modelo (0-1)', default: 0.2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({ description: 'Máx. itens por job', default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  maxItemsPerJob?: number;
}

