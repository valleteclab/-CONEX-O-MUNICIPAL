import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListDirectoryQueryDto {
  @ApiPropertyOptional({ description: 'Slug do tenant (default: env DEFAULT_TENANT_SLUG)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tenant?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ enum: ['perfil', 'loja'] })
  @IsOptional()
  @IsIn(['perfil', 'loja'])
  modo?: 'perfil' | 'loja';

  @ApiPropertyOptional({ description: 'Busca em nome e descrição' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({ enum: ['name', 'recent'] })
  @IsOptional()
  @IsIn(['name', 'recent'])
  sort?: 'name' | 'recent';

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
}
