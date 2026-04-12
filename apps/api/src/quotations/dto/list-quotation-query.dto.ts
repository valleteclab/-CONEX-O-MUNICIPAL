import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class ListQuotationQueryDto {
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

  @ApiPropertyOptional({ enum: ['private_market', 'public_procurement'] })
  @IsOptional()
  @IsIn(['private_market', 'public_procurement'])
  kind?: 'private_market' | 'public_procurement';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;
}
