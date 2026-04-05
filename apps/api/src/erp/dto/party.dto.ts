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

export class CreateErpPartyDto {
  @ApiProperty({ enum: ['customer', 'supplier', 'both'] })
  @IsString()
  @IsIn(['customer', 'supplier', 'both'])
  type!: 'customer' | 'supplier' | 'both';

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;
}

export class UpdateErpPartyDto {
  @ApiPropertyOptional({ enum: ['customer', 'supplier', 'both'] })
  @IsOptional()
  @IsString()
  @IsIn(['customer', 'supplier', 'both'])
  type?: 'customer' | 'supplier' | 'both';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  document?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
