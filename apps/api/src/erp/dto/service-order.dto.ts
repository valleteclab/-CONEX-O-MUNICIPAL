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

export class ServiceOrderLineDto {
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

export class CreateServiceOrderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  quoteId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  assignedTo?: string;

  @ApiProperty({ type: [ServiceOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ServiceOrderLineDto)
  items!: ServiceOrderLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PatchServiceOrderStatusDto {
  @ApiProperty({
    enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'],
  })
  @IsString()
  @IsIn(['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'])
  status!: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}
