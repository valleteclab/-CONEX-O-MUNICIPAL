import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListAcademyQueryDto {
  @ApiPropertyOptional({ description: 'Slug do tenant' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenant?: string;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por categoria (valor exato, como gravado no curso)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  category?: string;
}
