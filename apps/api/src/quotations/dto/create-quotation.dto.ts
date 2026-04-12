import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateQuotationDto {
  @ApiProperty({ example: 'Reforma elétrica em salão comercial' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(8000)
  description?: string;

  @ApiPropertyOptional({ enum: ['private_market', 'public_procurement'] })
  @IsOptional()
  @IsIn(['private_market', 'public_procurement'])
  kind?: 'private_market' | 'public_procurement';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  desiredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  requesterBusinessId?: string;
}
