import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class QuoteLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @IsNumberString()
  qty!: string;

  @ApiProperty()
  @IsNumberString()
  unitPrice!: string;
}

export class CreateQuoteDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional({ enum: ['erp', 'marketplace', 'opportunity'] })
  @IsOptional()
  @IsIn(['erp', 'marketplace', 'opportunity'])
  source?: 'erp' | 'marketplace' | 'opportunity';

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiProperty({ type: [QuoteLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuoteLineDto)
  items!: QuoteLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PatchQuoteStatusDto {
  @ApiProperty({
    enum: ['draft', 'sent', 'approved', 'rejected', 'cancelled'],
  })
  @IsString()
  @IsIn(['draft', 'sent', 'approved', 'rejected', 'cancelled'])
  status!: 'draft' | 'sent' | 'approved' | 'rejected' | 'cancelled';
}
