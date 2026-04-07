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
  ValidateNested,
} from 'class-validator';

export class SalesOrderLineDto {
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

export class CreateSalesOrderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partyId?: string;

  @ApiProperty({ type: [SalesOrderLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SalesOrderLineDto)
  items!: SalesOrderLineDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PatchSalesOrderStatusDto {
  @ApiProperty({ enum: ['draft', 'confirmed', 'cancelled'] })
  @IsString()
  @IsIn(['draft', 'confirmed', 'cancelled'])
  status!: 'draft' | 'confirmed' | 'cancelled';
}
